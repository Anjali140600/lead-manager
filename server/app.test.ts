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

  beforeEach(() => {
    db = createDatabase(':memory:');
    app = createApp(db);
  });

  afterEach(() => db.close());

  it('creates and lists a lead', async () => {
    const created = await request(app).post('/api/leads').send(validLead).expect(201);
    expect(created.body.data).toMatchObject(validLead);
    expect(created.body.data.id).toBeTypeOf('number');

    const list = await request(app).get('/api/leads').expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.pagination.total).toBe(1);
  });

  it('rejects invalid input', async () => {
    const response = await request(app).post('/api/leads').send({ ...validLead, email: 'not-an-email' }).expect(400);
    expect(response.body.error.fields.email).toBeTruthy();
  });

  it('updates an existing lead', async () => {
    const created = await request(app).post('/api/leads').send(validLead);
    const response = await request(app)
      .put(`/api/leads/${created.body.data.id}`)
      .send({ ...validLead, status: 'Qualified' })
      .expect(200);
    expect(response.body.data.status).toBe('Qualified');
  });

  it('filters by name and status and returns dashboard counts', async () => {
    await request(app).post('/api/leads').send(validLead);
    await request(app).post('/api/leads').send({ ...validLead, name: 'Mira Patel', email: 'mira@example.com', status: 'Contacted' });

    const filtered = await request(app).get('/api/leads?search=Mira&status=Contacted').expect(200);
    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.data[0].name).toBe('Mira Patel');

    const stats = await request(app).get('/api/leads/stats').expect(200);
    expect(stats.body.data).toEqual({ Total: 2, New: 1, Contacted: 1, Qualified: 0, Lost: 0 });
  });

  it('deletes a lead and handles missing records', async () => {
    const created = await request(app).post('/api/leads').send(validLead);
    await request(app).delete(`/api/leads/${created.body.data.id}`).expect(204);
    await request(app).delete(`/api/leads/${created.body.data.id}`).expect(404);
  });
});
