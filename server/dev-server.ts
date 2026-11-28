/**
 * Local API server: `npm run dev` → http://localhost:3001
 * Serves the same handlers Vercel will run in production.
 */
import { createServer } from 'node:http';
import { conditionsHandler, spotsHandler } from './lib/handlers.js';

const PORT = Number(process.env.PORT ?? 3001);

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  let out: Response;
  try {
    if (url.pathname === '/api/spots') out = spotsHandler();
    else if (url.pathname === '/api/conditions') out = await conditionsHandler(new Request(url));
    else out = new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  } catch (e) {
    console.error(e);
    out = new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
  res.writeHead(out.status, Object.fromEntries(out.headers));
  res.end(await out.text());
}).listen(PORT, () => {
  console.log(`Maui conditions API on http://localhost:${PORT} (data: ${process.env.DATA_MODE ?? 'live'})`);
});
