// Vercel serverless function: the same Express API, so one Vercel project hosts UI + API.
import { createApp, connectDb } from '../server/src/app.js';

const app = createApp();

export default async function handler(req, res) {
  try {
    await connectDb();
  } catch (err) {
    console.error('DB connection failed:', err.message);
    return res.status(503).json({ error: 'Database unavailable' });
  }
  return app(req, res);
}
