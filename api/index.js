// Vercel serverless function: the same Express API, so one Vercel project hosts UI + API.
import { createApp, connectDb } from '../server/src/app.js';

const app = createApp();

export default async function handler(req, res) {
  await connectDb();
  return app(req, res);
}
