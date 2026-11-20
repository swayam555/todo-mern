// The same Express API, served as a Netlify Function so frontend + API deploy together.
import serverless from 'serverless-http';
import { createApp, connectDb } from '../../server/src/app.js';

const app = serverless(createApp(), {
  // Requests arrive via the /api/* redirect; normalise if Netlify hands us the function path.
  request: (req) => { req.url = req.url.replace(/^\/\.netlify\/functions\/api/, '/api'); },
});

export const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  await connectDb();
  return app(event, context);
};
