import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import { join } from 'node:path';
import { ZodError } from 'zod';
import type { Database } from './database.js';
import { createSession, currentUser, destroySession, hashPassword, requireAuth, verifyPassword, type AuthUser } from './auth.js';
import { idSchema, leadSchema, loginSchema, querySchema, signupSchema } from './validation.js';
import { LEAD_STATUSES, toLead, type LeadRow } from './types.js';

const SORT_COLUMNS = { name: 'name', status: 'status', createdAt: 'created_at' } as const;

export function createApp(db: Database) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '20kb' }));

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.post('/api/auth/signup', async (request, response) => {
    const input = signupSchema.parse(request.body);
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(input.email);
    if (existing) return response.status(409).json({ error: { message: 'An account with this email already exists.' } });
    const passwordHash = await hashPassword(input.password);
    const result = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
      .run(input.name, input.email, passwordHash);
    const user = { id: Number(result.lastInsertRowid), name: input.name, email: input.email };
    createSession(db, user.id, response);
    response.status(201).json({ data: user });
  });

  app.post('/api/auth/login', async (request, response) => {
    const input = loginSchema.parse(request.body);
    const row = db.prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?').get(input.email) as (AuthUser & { password_hash: string }) | undefined;
    if (!row || !await verifyPassword(input.password, row.password_hash)) {
      return response.status(401).json({ error: { message: 'Incorrect email or password.' } });
    }
    createSession(db, row.id, response);
    response.json({ data: { id: row.id, name: row.name, email: row.email } });
  });

  app.post('/api/auth/logout', (request, response) => {
    destroySession(db, request, response);
    response.status(204).send();
  });

  app.get('/api/auth/me', (request, response) => {
    const user = currentUser(db, request);
    if (!user) return response.status(401).json({ error: { message: 'Please log in to continue.' } });
    response.json({ data: user });
  });

  app.use('/api/leads', requireAuth(db));

  app.get('/api/leads/stats', (_request, response) => {
    const user = response.locals.user as AuthUser;
    const rows = db.prepare('SELECT status, COUNT(*) AS count FROM leads WHERE user_id = ? GROUP BY status').all(user.id) as Array<{ status: string; count: number }>;
    const data: Record<string, number> = { Total: 0, New: 0, Contacted: 0, Qualified: 0, Lost: 0 };
    for (const row of rows) {
      data[row.status] = Number(row.count);
      data.Total += Number(row.count);
    }
    response.json({ data });
  });

  app.get('/api/leads', (request, response) => {
    const user = response.locals.user as AuthUser;
    const query = querySchema.parse(request.query);
    const clauses: string[] = ['user_id = :userId'];
    const parameters: Record<string, string | number> = { userId: user.id };

    if (query.search) {
      clauses.push('name LIKE :search ESCAPE \'\\\'');
      parameters.search = `%${query.search.replace(/[\\%_]/g, '\\$&')}%`;
    }
    if (query.status) {
      clauses.push('status = :status');
      parameters.status = query.status;
    }

    const where = `WHERE ${clauses.join(' AND ')}`;
    const totalRow = db.prepare(`SELECT COUNT(*) AS count FROM leads ${where}`).get(parameters) as { count: number };
    const total = Number(totalRow.count);
    const totalPages = Math.max(1, Math.ceil(total / query.limit));
    const page = Math.min(query.page, totalPages);
    parameters.limit = query.limit;
    parameters.offset = (page - 1) * query.limit;

    const rows = db.prepare(`
      SELECT * FROM leads ${where}
      ORDER BY ${SORT_COLUMNS[query.sortBy]} ${query.sortOrder.toUpperCase()}, id DESC
      LIMIT :limit OFFSET :offset
    `).all(parameters) as unknown as LeadRow[];

    response.json({
      data: rows.map(toLead),
      pagination: { page, limit: query.limit, total, totalPages },
    });
  });

  app.post('/api/leads', (request, response) => {
    const user = response.locals.user as AuthUser;
    const lead = leadSchema.parse(request.body);
    const result = db.prepare(`
      INSERT INTO leads (user_id, name, email, phone, company, source, status)
      VALUES (:userId, :name, :email, :phone, :company, :source, :status)
    `).run({ ...lead, userId: user.id });
    const row = db.prepare('SELECT * FROM leads WHERE id = ? AND user_id = ?').get(result.lastInsertRowid, user.id) as unknown as LeadRow;
    response.status(201).json({ data: toLead(row) });
  });

  app.put('/api/leads/:id', (request, response) => {
    const user = response.locals.user as AuthUser;
    const id = idSchema.parse(request.params.id);
    const lead = leadSchema.parse(request.body);
    const result = db.prepare(`
      UPDATE leads SET
        name = :name, email = :email, phone = :phone, company = :company,
        source = :source, status = :status,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = :id AND user_id = :userId
    `).run({ ...lead, id, userId: user.id });
    if (result.changes === 0) return response.status(404).json({ error: { message: 'Lead not found.' } });
    const row = db.prepare('SELECT * FROM leads WHERE id = ? AND user_id = ?').get(id, user.id) as unknown as LeadRow;
    response.json({ data: toLead(row) });
  });

  app.delete('/api/leads/:id', (request, response) => {
    const user = response.locals.user as AuthUser;
    const id = idSchema.parse(request.params.id);
    const result = db.prepare('DELETE FROM leads WHERE id = ? AND user_id = ?').run(id, user.id);
    if (result.changes === 0) return response.status(404).json({ error: { message: 'Lead not found.' } });
    response.status(204).send();
  });

  if (process.env.NODE_ENV === 'production') {
    const clientPath = join(process.cwd(), 'dist');
    app.use(express.static(clientPath));
    app.get('/*path', (_request, response) => response.sendFile(join(clientPath, 'index.html')));
  }

  app.use((_request, response) => {
    response.status(404).json({ error: { message: 'Route not found.' } });
  });

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof ZodError) {
      const fields = Object.fromEntries(error.issues.map((issue) => [issue.path.join('.') || 'request', issue.message]));
      response.status(400).json({ error: { message: 'Please correct the invalid fields.', fields } });
      return;
    }
    if (error instanceof SyntaxError && 'body' in error) {
      response.status(400).json({ error: { message: 'Request body must be valid JSON.' } });
      return;
    }
    console.error(error);
    response.status(500).json({ error: { message: 'An unexpected server error occurred.' } });
  };
  app.use(errorHandler);

  return app;
}
