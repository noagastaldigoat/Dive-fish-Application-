/**
 * Short-lived response cache + "last good value" store.
 *
 * - Fresh cache: don't hit NOAA more than once per TTL per feed.
 * - Last good: if a feed goes down, serve the last value we got, marked
 *   status "cached", so the app keeps working through outages.
 *
 * This lives in memory for local development. The planned Supabase table
 * (see ../supabase/schema.sql) replaces it so the last-good values and the
 * 7-day history survive restarts and are shared across serverless instances.
 */
import type { FeedResult } from './types.js';

interface Entry {
  result: FeedResult<unknown>;
  storedAt: number;
}

const fresh = new Map<string, Entry>();
const lastGood = new Map<string, FeedResult<unknown>>();

export async function cachedFeed<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<FeedResult<T>>,
  now = Date.now(),
): Promise<FeedResult<T>> {
  const hit = fresh.get(key);
  if (hit && now - hit.storedAt < ttlMs) return hit.result as FeedResult<T>;

  const result = await load();
  if (result.status === 'unavailable') {
    const prev = lastGood.get(key) as FeedResult<T> | undefined;
    if (prev) return { ...prev, status: 'cached', error: result.error };
    return result;
  }
  fresh.set(key, { result, storedAt: now });
  lastGood.set(key, result);
  return result;
}

export function clearCache() {
  fresh.clear();
  lastGood.clear();
}
