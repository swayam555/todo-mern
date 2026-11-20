import { beforeAll, afterAll, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mem, handler;
beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mem.getUri('fn');
  ({ handler } = await import('../../netlify/functions/api.mjs'));
}, 120_000);
afterAll(async () => { await mongoose.disconnect(); await mem?.stop(); });

const ev = (httpMethod, path, body) => ({
  httpMethod, path, queryStringParameters: {}, multiValueHeaders: {}, isBase64Encoded: false,
  headers: { 'x-client-id': '33333333-3333-4333-8333-333333333333', 'content-type': 'application/json', host: 'x.netlify.app' },
  body: body ? JSON.stringify(body) : null,
});

it('serves the API through the Netlify function under both path styles', async () => {
  const created = await handler(ev('POST', '/api/tasks', { title: 'fn', dueAt: '2026-11-16T09:00:00Z' }), {});
  expect(created.statusCode).toBe(201);
  const weeks = await handler(ev('GET', '/.netlify/functions/api/tasks/weeks'), {});
  expect(weeks.statusCode).toBe(200);
  expect(JSON.parse(weeks.body)).toEqual([{ weekStart: '2026-11-16', total: 1, completed: 0, open: 1 }]);
});
