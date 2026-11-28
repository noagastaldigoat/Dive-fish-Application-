import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseSpec, parseStandard } from '../lib/feeds/ndbc.js';
import { parseHiLo, parseLatestLevel } from '../lib/feeds/tides.js';
import { estimateClarity } from '../lib/clarity.js';
import { buildConditions, type Feeds } from '../lib/conditions.js';
import { getSpot } from '../lib/spots.js';
import { sunMoon } from '../lib/astro.js';
import { cachedFeed, clearCache } from '../lib/cache.js';
import { inArc } from '../lib/util.js';

const fx = (f: string) => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8');

describe('NDBC buoy parsing (real Pauwela 51205 sample)', () => {
  it('reads the newest row of the standard file', () => {
    const o = parseStandard(fx('51205.txt'))!;
    expect(o.observedAt).toBe('2026-10-13T18:56:00.000Z');
    expect(o.waveHeightM).toBe(2.2);
    expect(o.dominantPeriodS).toBe(14);
    expect(o.meanDirectionDeg).toBe(323);
    expect(o.waterTempC).toBe(26.8);
  });
  it('splits swell and wind waves from the spec file', () => {
    const s = parseSpec(fx('51205.spec'))!;
    expect(s.swell).toEqual({ heightM: 1.4, periodS: 14.3, directionDeg: 315 });
    expect(s.windWave).toEqual({ heightM: 1.7, periodS: 7.7, directionDeg: 90 });
  });
  it('treats MM as missing', () => {
    const txt = fx('51205.txt').replace(' 2.2    14   7.2 323', '  MM    MM    MM  MM');
    expect(parseStandard(txt)!.observedAt).toBe('2026-10-13T18:26:00.000Z');
  });
});

describe('NOAA CO-OPS tides (real Kahului 1615680 sample)', () => {
  it('parses high/low predictions', () => {
    const t = parseHiLo(fx('tide-hilo.json'));
    expect(t).toHaveLength(4);
    expect(t[0]).toEqual({ time: '2026-11-27T14:59:00.000Z', heightFt: 2.837, type: 'high' });
    expect(t[3].type).toBe('low');
  });
  it('parses the latest water level', () => {
    expect(parseLatestLevel(fx('water-level.json'))).toEqual({ observedAt: '2026-11-27T22:00:00.000Z', heightFt: 1.119 });
  });
  it('surfaces NOAA error messages', () => {
    expect(() => parseHiLo('{"error":{"message":"No data was found"}}')).toThrow('No data was found');
  });
});

describe('clarity estimate', () => {
  const base = {
    observedAt: '2026-11-27T21:30:00.000Z', waveHeightM: 2, dominantPeriodS: 14, meanDirectionDeg: 315,
    swell: { heightM: 2, periodS: 14, directionDeg: 315 }, windWave: null, waterTempC: null,
  };
  it('downgrades a spot that faces the swell', () => {
    const e = estimateClarity(getSpot('honolua')!, base, false);
    expect(e.score).toBeLessThanOrEqual(2);
    expect(e.confidence).toBe('Low');
  });
  it('leaves a sheltered spot alone', () => {
    expect(estimateClarity(getSpot('makena')!, base, false).score).toBe(5);
  });
  it('handles exposure arcs that wrap through north', () => {
    expect(inArc(350, 280, 20)).toBe(true);
    expect(inArc(10, 280, 20)).toBe(true);
    expect(inArc(180, 280, 20)).toBe(false);
  });
});

describe('buildConditions', () => {
  const now = new Date('2026-11-27T22:05:00Z');
  const obs = { ...parseStandard(fx('51205.txt'))!, ...parseSpec(fx('51205.spec'))! };
  const feeds = (buoyTime: string, down = false): Feeds => ({
    buoy: async (id) =>
      down
        ? { status: 'unavailable', data: null, source: { name: `NDBC ${id}`, url: '' }, fetchedAt: now.toISOString(), error: 'HTTP 503' }
        : { status: 'ok', data: { ...obs, observedAt: buoyTime }, source: { name: `NDBC ${id}`, url: '' }, fetchedAt: now.toISOString() },
    tides: async () => ({ status: 'ok', data: parseHiLo(fx('tide-hilo.json')), source: { name: 't', url: '' }, fetchedAt: '' }),
    waterLevel: async () => ({ status: 'ok', data: parseLatestLevel(fx('water-level.json')), source: { name: 'w', url: '' }, fetchedAt: '' }),
  });

  it('labels every reading with kind, source and time', async () => {
    const c = await buildConditions(getSpot('honolua')!, now, feeds('2026-11-27T21:56:00.000Z'));
    for (const r of [c.swell.primary, c.swell.secondary, c.swell.significant, c.tide.now]) {
      expect(r!.kind).toBe('measured');
      expect(r!.source.name).toBeTruthy();
      expect(r!.observedAt).toBeTruthy();
      expect(r!.stale).toBe(false);
    }
    expect(c.clarity!.kind).toBe('estimate');
    expect(c.swell.primary!.display).toBe('4.6 ft @ 14 s from NW');
    expect(c.warnings).toEqual([]);
    expect(c.disclaimer).toMatch(/not a guarantee/);
  });

  it('flags old buoy data as stale and refuses a clarity rating', async () => {
    const c = await buildConditions(getSpot('honolua')!, now, feeds('2026-10-13T18:56:00.000Z'));
    expect(c.swell.primary!.stale).toBe(true);
    expect(c.clarity!.value).toBeNull();
    expect(c.clarity!.display).toBe('Unknown');
    expect(c.warnings[0]).toMatch(/last reported 45 days ago/);
  });

  it('keeps working when the buoy is down', async () => {
    const c = await buildConditions(getSpot('makena')!, now, feeds('', true));
    expect(c.swell.primary).toBeNull();
    expect(c.clarity).toBeNull();
    expect(c.tide.now!.value).toBe(1.119);
    expect(c.warnings[0]).toMatch(/not reporting/);
  });

  it('only lists upcoming tides', async () => {
    const c = await buildConditions(getSpot('kanaha')!, new Date('2026-11-27T23:00:00Z'), feeds('2026-11-27T22:56:00.000Z'));
    expect(c.tide.next.map((t) => t.type)).toEqual(['high', 'low']);
  });
});

describe('backup buoys', () => {
  const now = new Date('2026-11-28T06:30:00Z');
  const obs = { ...parseStandard(fx('51205.txt'))!, ...parseSpec(fx('51205.spec'))! };
  const base: Omit<Feeds, 'buoy'> = {
    tides: async () => ({ status: 'ok', data: [], source: { name: 't', url: '' }, fetchedAt: '' }),
    waterLevel: async () => ({ status: 'unavailable', data: null, source: { name: 'w', url: '' }, fetchedAt: '' }),
  };
  it('switches to the first fresh backup and says so', async () => {
    const fresh: Record<string, string> = { '51205': '2026-10-13T18:56:00.000Z', '51201': '2026-11-28T06:26:00.000Z', '51202': '2026-11-28T06:26:00.000Z' };
    const c = await buildConditions(getSpot('honolua')!, now, {
      ...base,
      buoy: async (id) => ({ status: 'ok', data: { ...obs, observedAt: fresh[id] }, source: { name: `NDBC ${id}`, url: '' }, fetchedAt: '' }),
    });
    expect(c.swell.primary!.source.name).toBe('NDBC 51201');
    expect(c.swell.primary!.stale).toBe(false);
    expect(c.clarity!.value).not.toBeNull();
    expect(c.warnings[0]).toMatch(/NDBC 51205 last reported 45 days ago\. Swell below is from NDBC 51201 instead/);
  });
  it('keeps the spot buoy when no backup is fresh either', async () => {
    const c = await buildConditions(getSpot('makena')!, now, {
      ...base,
      buoy: async (id) => ({ status: 'unavailable', data: null, source: { name: `NDBC ${id}`, url: '' }, fetchedAt: '' }),
    });
    expect(c.swell.primary).toBeNull();
    expect(c.warnings[0]).toMatch(/NDBC 51213 is not reporting/);
  });
});

describe('cache', () => {
  it('serves the last good value when a feed goes down', async () => {
    clearCache();
    const src = { name: 's', url: '' };
    await cachedFeed('k', 0, async () => ({ status: 'ok', data: 1, source: src, fetchedAt: 'a' }), 0);
    const r = await cachedFeed('k', 0, async () => ({ status: 'unavailable', data: null, source: src, fetchedAt: 'b', error: 'down' }), 1);
    expect(r).toMatchObject({ status: 'cached', data: 1, error: 'down' });
  });
});

describe('sun and moon', () => {
  it('gives Maui sunrise around 6:45 am HST in late November', () => {
    const s = sunMoon(20.8, -156.5, new Date('2026-11-27T22:00:00Z'));
    const hst = new Date(new Date(s.sunrise!).getTime() - 10 * 3600_000);
    expect(hst.getUTCHours()).toBe(6);
    expect(s.moonIllumination).toBeGreaterThanOrEqual(0);
  });
});
