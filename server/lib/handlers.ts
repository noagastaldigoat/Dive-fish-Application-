/**
 * Request handlers shared by the Vercel functions (api/*.ts) and the local
 * dev server (dev-server.ts). Plain Web Request/Response, no framework.
 */
import { SPOTS, getSpot } from './spots.js';
import { buildConditions, liveFeeds, type Feeds } from './conditions.js';
import { fixtureFeeds } from './fixtureFeeds.js';

const headers = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  // Let Vercel's CDN absorb repeat requests for a couple of minutes.
  'cache-control': 'public, s-maxage=120, stale-while-revalidate=600',
};

function feeds(): Feeds {
  return process.env.DATA_MODE === 'fixtures' ? fixtureFeeds : liveFeeds;
}

export function spotsHandler(): Response {
  return new Response(JSON.stringify({ spots: SPOTS }), { headers });
}

export async function conditionsHandler(req: Request): Promise<Response> {
  const id = new URL(req.url).searchParams.get('spot') ?? '';
  const spot = getSpot(id);
  if (!spot) return new Response(JSON.stringify({ error: `Unknown spot "${id}"` }), { status: 404, headers });
  const body = await buildConditions(spot, new Date(), feeds());
  return new Response(JSON.stringify(body), { headers });
}
