import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { createDatabase, type Database } from './database.js';

const validLead = {
  name: 'Aarav Sharma',
  email: 'aarav@example.com',
  phone: '+91 98765 43210',
  company: 'Acme India',
  source: 'Referral',
  status: 'New',
};

describe('leads API', () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;
  let agent: ReturnType<typeof request.agent>;

  beforeEach(() => {
    db = createDatabase(':memory:');
    app = createApp(db);
    agent = request.agent(app);
  });

  afterEach(() => db.close());

  async function createAccount(email = 'owner@example.com') {
    return agent.post('/api/auth/signup').send({ name: 'Lead Owner', email, password: 'strongpass123' }).expect(201);
  }

  it('requires authentication for lead data', async () => {
    await request(app).get('/api/leads').expect(401);
  });

  it('supports signup, current user, logout, and login', async () => {
    await createAccount();
    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body.data.email).toBe('owner@example.com');
    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/me').expect(401);
    await agent.post('/api/auth/login').send({ email: 'owner@example.com', password: 'strongpass123' }).expect(200);
  });

  it('creates and lists a lead', async () => {
    await createAccount();
    const created = await agent.post('/api/leads').send(validLead).expect(201);
    expect(created.body.data).toMatchObject(validLead);
    expect(created.body.data.id).toBeTypeOf('number');

    const list = await agent.get('/api/leads').expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.pagination.total).toBe(1);
  });

  it('rejects invalid input', async () => {
    await createAccount();
    const response = await agent.post('/api/leads').send({ ...validLead, email: 'not-an-email' }).expect(400);
    expect(response.body.error.fields.email).toBeTruthy();
  });

  it('updates an existing lead', async () => {
    await createAccount();
    const created = await agent.post('/api/leads').send(validLead);
    const response = await agent
      .put(`/api/leads/${created.body.data.id}`)
      .send({ ...validLead, status: 'Qualified' })
      .expect(200);
    expect(response.body.data.status).toBe('Qualified');
  });

  it('filters by name and status and returns dashboard counts', async () => {
    await createAccount();
    await agent.post('/api/leads').send(validLead);
    await agent.post('/api/leads').send({ ...validLead, name: 'Mira Patel', email: 'mira@example.com', status: 'Contacted' });

    const filtered = await agent.get('/api/leads?search=Mira&status=Contacted').expect(200);
    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.data[0].name).toBe('Mira Patel');

    const stats = await agent.get('/api/leads/stats').expect(200);
    expect(stats.body.data).toEqual({ Total: 2, New: 1, Contacted: 1, Qualified: 0, Lost: 0 });
  });

  it('deletes a lead and handles missing records', async () => {
    await createAccount();
    const created = await agent.post('/api/leads').send(validLead);
    await agent.delete(`/api/leads/${created.body.data.id}`).expect(204);
    await agent.delete(`/api/leads/${created.body.data.id}`).expect(404);
  });

  it('keeps leads private between accounts', async () => {
    await createAccount();
    const created = await agent.post('/api/leads').send(validLead).expect(201);
    const other = request.agent(app);
    await other.post('/api/auth/signup').send({ name: 'Other User', email: 'other@example.com', password: 'strongpass123' }).expect(201);
    const otherList = await other.get('/api/leads').expect(200);
    expect(otherList.body.data).toHaveLength(0);
    await other.put(`/api/leads/${created.body.data.id}`).send({ ...validLead, status: 'Lost' }).expect(404);
    await other.delete(`/api/leads/${created.body.data.id}`).expect(404);
  });
});
