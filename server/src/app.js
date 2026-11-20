import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import tasks from './routes/tasks.js';
import { HttpError, requireClient } from './lib/http.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  const origins = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
  app.use(cors({ origin: origins.length ? origins : true }));
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1 }));
  app.use('/api/tasks', requireClient, tasks);
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Not found')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON' });
    if (err instanceof mongoose.Error.ValidationError) {
      const details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
      return res.status(400).json({ error: Object.values(details)[0], details });
    }
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message, ...(err.details && { details: err.details }) });
  });
  return app;
}

let connecting;
/** Reused across warm serverless invocations. */
/** Tolerate common copy-paste slips in the env value: spaces, quotes, a leading "MONGODB_URI=". */
export const cleanUri = (uri) => (uri || '').trim().replace(/^MONGODB_URI\s*=\s*/, '').replace(/^(['"])(.*)\1$/, '$2').trim();

export function connectDb(raw = process.env.MONGODB_URI) {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  const uri = cleanUri(raw);
  if (!uri) throw new Error('MONGODB_URI is not set');
  connecting ||= mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 }).catch((e) => { connecting = undefined; throw e; });
  return connecting;
}
