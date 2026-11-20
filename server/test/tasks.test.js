import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp, connectDb } from '../src/app.js';
import { Task } from '../src/models/Task.js';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
let mem, app;

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await connectDb(mem.getUri('todo-test'));
  app = createApp();
}, 120_000);
afterAll(async () => { await mongoose.disconnect(); await mem?.stop(); });
beforeEach(async () => { await Task.deleteMany({}); });

const as = (id) => ({
  get: (u) => request(app).get(u).set('X-Client-Id', id),
  post: (u, b) => request(app).post(u).set('X-Client-Id', id).send(b),
  patch: (u, b) => request(app).patch(u).set('X-Client-Id', id).send(b),
  del: (u) => request(app).delete(u).set('X-Client-Id', id),
});
const a = as(A);

describe('health & client id', () => {
  it('reports health', async () => {
    const r = await request(app).get('/api/health');
    expect(r.body).toEqual({ ok: true, db: true });
  });
  it('rejects requests without a valid client id', async () => {
    expect((await request(app).get('/api/tasks')).status).toBe(400);
    expect((await request(app).get('/api/tasks').set('X-Client-Id', 'nope')).status).toBe(400);
  });
  it('404s unknown api routes', async () => {
    expect((await request(app).get('/api/zzz')).status).toBe(404);
  });
});

describe('create', () => {
  it('creates with all attributes', async () => {
    const r = await a.post('/api/tasks', { title: '  Buy milk ', description: '2L', dueAt: '2026-11-16T09:00:00Z', priority: 'high' });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ title: 'Buy milk', description: '2L', priority: 'high', status: 'in_progress', completedAt: null });
    expect(r.body.id).toMatch(/^[a-f0-9]{24}$/);
    expect(r.body.owner).toBeUndefined();
    expect(r.body._id).toBeUndefined();
  });
  it('priority and description are optional', async () => {
    const r = await a.post('/api/tasks', { title: 'x', dueAt: '2026-11-16T09:00:00Z' });
    expect(r.status).toBe(201);
    expect(r.body.priority).toBeNull();
    expect(r.body.description).toBe('');
  });
  it.each([
    [{ dueAt: '2026-11-16T09:00:00Z' }, 'title'],
    [{ title: '   ', dueAt: '2026-11-16T09:00:00Z' }, 'title'],
    [{ title: 'x' }, 'dueAt'],
    [{ title: 'x', dueAt: 'not-a-date' }, 'dueAt'],
    [{ title: 'x', dueAt: '2026-11-16T09:00:00Z', priority: 'urgent' }, 'priority'],
  ])('validates %j', async (body, field) => {
    const r = await a.post('/api/tasks', body);
    expect(r.status).toBe(400);
    expect(r.body.details[field]).toBeTruthy();
  });
  it('rejects overly long title via mongoose validation', async () => {
    const r = await a.post('/api/tasks', { title: 'x'.repeat(121), dueAt: '2026-11-16T09:00:00Z' });
    expect(r.status).toBe(400);
    expect(r.body.details.title).toBeTruthy();
  });
  it('rejects malformed JSON', async () => {
    const r = await request(app).post('/api/tasks').set('X-Client-Id', A).set('Content-Type', 'application/json').send('{bad');
    expect(r.status).toBe(400);
  });
});

describe('read / edit / status / delete', () => {
  let id;
  beforeEach(async () => {
    id = (await a.post('/api/tasks', { title: 'Report', dueAt: '2026-11-17T10:00:00Z', priority: 'low' })).body.id;
  });

  it('gets one task', async () => {
    expect((await a.get(`/api/tasks/${id}`)).body.title).toBe('Report');
  });
  it('edits any attribute', async () => {
    const r = await a.patch(`/api/tasks/${id}`, { title: 'Q4 report', description: 'draft', dueAt: '2026-11-20T08:00:00Z', priority: 'medium' });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ title: 'Q4 report', description: 'draft', priority: 'medium', dueAt: '2026-11-20T08:00:00.000Z' });
  });
  it('can clear priority', async () => {
    expect((await a.patch(`/api/tasks/${id}`, { priority: null })).body.priority).toBeNull();
    expect((await a.patch(`/api/tasks/${id}`, { priority: '' })).body.priority).toBeNull();
  });
  it('rejects clearing mandatory fields', async () => {
    expect((await a.patch(`/api/tasks/${id}`, { title: '' })).status).toBe(400);
    expect((await a.patch(`/api/tasks/${id}`, { dueAt: null })).status).toBe(400);
  });
  it('toggles completed / in progress and tracks completedAt', async () => {
    const done = await a.patch(`/api/tasks/${id}`, { status: 'completed' });
    expect(done.body.status).toBe('completed');
    expect(done.body.completedAt).toBeTruthy();
    const back = await a.patch(`/api/tasks/${id}`, { status: 'in_progress' });
    expect(back.body.completedAt).toBeNull();
    expect((await a.patch(`/api/tasks/${id}`, { status: 'archived' })).status).toBe(400);
  });
  it('ignores non-editable fields', async () => {
    const r = await a.patch(`/api/tasks/${id}`, { owner: B, createdAt: '2000-01-01' });
    expect(r.status).toBe(200);
    expect((await as(B).get(`/api/tasks/${id}`)).status).toBe(404);
  });
  it('deletes', async () => {
    expect((await a.del(`/api/tasks/${id}`)).status).toBe(204);
    expect((await a.get(`/api/tasks/${id}`)).status).toBe(404);
    expect((await a.del(`/api/tasks/${id}`)).status).toBe(404);
  });
  it('404s for bad ids', async () => {
    expect((await a.get('/api/tasks/123')).status).toBe(404);
    expect((await a.get('/api/tasks/aaaaaaaaaaaaaaaaaaaaaaaa')).status).toBe(404);
  });
  it('isolates clients from each other', async () => {
    const b = as(B);
    expect((await b.get(`/api/tasks/${id}`)).status).toBe(404);
    expect((await b.patch(`/api/tasks/${id}`, { title: 'hijack' })).status).toBe(404);
    expect((await b.del(`/api/tasks/${id}`)).status).toBe(404);
    expect((await b.get('/api/tasks')).body).toEqual([]);
    expect((await b.get('/api/tasks/weeks')).body).toEqual([]);
  });
});

describe('search', () => {
  beforeEach(async () => {
    await a.post('/api/tasks', { title: 'Call the dentist', description: 'reschedule cleaning', dueAt: '2026-11-16T09:00:00Z' });
    await a.post('/api/tasks', { title: 'Groceries', description: 'milk, eggs (large)', dueAt: '2026-11-18T09:00:00Z' });
    await a.post('/api/tasks', { title: 'Team sync', description: 'call notes', dueAt: '2026-11-24T09:00:00Z' });
    await as(B).post('/api/tasks', { title: 'Call mom', dueAt: '2026-11-16T09:00:00Z' });
  });
  const titles = async (q) => (await a.get(`/api/tasks?q=${encodeURIComponent(q)}`)).body.map((t) => t.title);

  it('matches title or description, case-insensitive, own tasks only, sorted by date', async () => {
    expect(await titles('CALL')).toEqual(['Call the dentist', 'Team sync']);
  });
  it('requires every keyword to match', async () => {
    expect(await titles('call dentist')).toEqual(['Call the dentist']);
    expect(await titles('call eggs')).toEqual([]);
  });
  it('treats regex characters literally', async () => {
    expect(await titles('(large)')).toEqual(['Groceries']);
    expect(await titles('.*')).toEqual([]);
  });
  it('empty query lists everything', async () => {
    expect(await titles('  ')).toHaveLength(3);
  });
});

describe('weekly grouping (Monday–Sunday)', () => {
  beforeEach(async () => {
    const mk = (title, dueAt, status) => a.post('/api/tasks', { title, dueAt }).then((r) =>
      status ? a.patch(`/api/tasks/${r.body.id}`, { status }) : r);
    await mk('mon', '2026-11-16T00:30:00Z');             // Mon 16 Nov UTC
    await mk('sun', '2026-11-22T23:30:00Z', 'completed'); // Sun 22 Nov UTC (same week)
    await mk('next mon', '2026-11-23T00:00:00Z');         // next week
    await mk('prev sun', '2026-11-15T12:00:00Z', 'completed');
  });

  it('groups by Monday-start week in UTC', async () => {
    const r = await a.get('/api/tasks/weeks?tz=UTC');
    expect(r.body).toEqual([
      { weekStart: '2026-11-09', total: 1, completed: 1, open: 0 },
      { weekStart: '2026-11-16', total: 2, completed: 1, open: 1 },
      { weekStart: '2026-11-23', total: 1, completed: 0, open: 1 },
    ]);
  });
  it('respects the user time zone', async () => {
    // In Kolkata (+5:30) Sun 22 Nov 23:30Z is Mon 23 Nov 05:00 → next week.
    const r = await a.get('/api/tasks/weeks?tz=Asia/Kolkata');
    expect(r.body).toEqual([
      { weekStart: '2026-11-09', total: 1, completed: 1, open: 0 },
      { weekStart: '2026-11-16', total: 1, completed: 0, open: 1 },
      { weekStart: '2026-11-23', total: 2, completed: 1, open: 1 },
    ]);
    // In New York (-5) Mon 16 Nov 00:30Z is still Sun 15 Nov → previous week.
    const ny = await a.get('/api/tasks/weeks?tz=America/New_York');
    expect(ny.body[0]).toEqual({ weekStart: '2026-11-09', total: 2, completed: 1, open: 1 });
  });
  it('lists the tasks of a single week', async () => {
    const r = await a.get('/api/tasks?week=2026-11-16&tz=UTC');
    expect(r.body.map((t) => t.title)).toEqual(['mon', 'sun']);
  });
  it('completing a task updates the week counts', async () => {
    const [t] = (await a.get('/api/tasks?week=2026-11-23&tz=UTC')).body;
    await a.patch(`/api/tasks/${t.id}`, { status: 'completed' });
    const wk = (await a.get('/api/tasks/weeks?tz=UTC')).body.find((w) => w.weekStart === '2026-11-23');
    expect(wk).toMatchObject({ open: 0, completed: 1 });
  });
  it('validates week and tz params', async () => {
    expect((await a.get('/api/tasks/weeks?tz=Mars/Base')).status).toBe(400);
    expect((await a.get('/api/tasks?week=16-11-2026')).status).toBe(400);
    expect((await a.get('/api/tasks?status=bogus')).status).toBe(400);
  });
  it('filters by status', async () => {
    expect((await a.get('/api/tasks?status=completed')).body.map((t) => t.title)).toEqual(['prev sun', 'sun']);
  });
});

describe('filters: priority & overdue', () => {
  const past = new Date(Date.now() - 2 * 864e5).toISOString();
  const future = new Date(Date.now() + 2 * 864e5).toISOString();
  beforeEach(async () => {
    await a.post('/api/tasks', { title: 'late high', dueAt: past, priority: 'high' });
    await a.post('/api/tasks', { title: 'late done', dueAt: past, priority: 'high', status: 'completed' });
    await a.post('/api/tasks', { title: 'soon low', dueAt: future, priority: 'low' });
    await as(B).post('/api/tasks', { title: 'other late', dueAt: past });
  });
  it('filters by priority and rejects bad values', async () => {
    expect((await a.get('/api/tasks?priority=high')).body.map((t) => t.title)).toEqual(['late high', 'late done']);
    expect((await a.get('/api/tasks?priority=urgent')).status).toBe(400);
  });
  it('overdue = in progress and past due, own tasks only', async () => {
    expect((await a.get('/api/tasks?overdue=1')).body.map((t) => t.title)).toEqual(['late high']);
    expect((await a.get('/api/tasks?overdue=1&status=completed')).body).toEqual([]);
  });
  it('combines keyword, priority and overdue', async () => {
    expect((await a.get('/api/tasks?q=late&priority=high&overdue=1')).body.map((t) => t.title)).toEqual(['late high']);
    expect((await a.get('/api/tasks?q=soon&overdue=1')).body).toEqual([]);
  });
});
