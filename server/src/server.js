import { createApp, connectDb } from './app.js';

const port = Number(process.env.PORT) || 4000;
let uri = process.env.MONGODB_URI;

if (!uri) {
  // Local dev convenience: no Mongo installed → spin up an in-memory one (data resets on restart).
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const mem = await MongoMemoryServer.create();
  uri = mem.getUri('todo');
  console.warn('MONGODB_URI not set — using in-memory MongoDB (data is not persisted)');
}

await connectDb(uri);
createApp().listen(port, () => console.log(`API listening on http://localhost:${port}`));
