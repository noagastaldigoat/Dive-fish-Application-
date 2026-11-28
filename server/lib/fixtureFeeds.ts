/**
 * Offline "demo mode" feeds built from real NOAA responses saved in
 * test/fixtures. Use with DATA_MODE=fixtures when you have no network or want
 * repeatable screenshots. Every reading is still labelled with its real source
 * and its real (old) timestamp, so the app shows it as stale.
 */
// Tide fixture times were converted to GMT (the live feed requests GMT).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Feeds } from './conditions.js';
import { buoySource, parseSpec, parseStandard } from './feeds/ndbc.js';
import { parseHiLo, parseLatestLevel, tideSource } from './feeds/tides.js';

const dir = fileURLToPath(new URL('../test/fixtures/', import.meta.url));
const read = (f: string) => readFileSync(dir + f, 'utf8');

export const fixtureFeeds: Feeds = {
  async buoy(id, now) {
    // Only Pauwela was captured; reuse it for any buoy in demo mode.
    const obs = parseStandard(read('51205.txt'))!;
    const spec = parseSpec(read('51205.spec'))!;
    return {
      status: 'stale',
      data: { ...obs, swell: spec.swell, windWave: spec.windWave },
      source: buoySource(id),
      fetchedAt: now.toISOString(),
    };
  },
  async tides(now) {
    return { status: 'ok', data: parseHiLo(read('tide-hilo.json')), source: tideSource(), fetchedAt: now.toISOString() };
  },
  async waterLevel(now) {
    return { status: 'ok', data: parseLatestLevel(read('water-level.json')), source: tideSource(), fetchedAt: now.toISOString() };
  },
};
