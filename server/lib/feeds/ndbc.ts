/**
 * NDBC real-time wave buoy feed.
 *
 * Maui buoys (both are CDIP Waveriders, relayed by NDBC every 30 min):
 *   51205  Pauwela, Maui (CDIP 187)  north shore swell
 *   51213  Kaumalapau Southwest, Lanai (CDIP 239)  south/west swell into Maui's leeward side
 *
 * Two files per buoy:
 *   realtime2/<id>.txt   significant height, dominant period, mean direction
 *   realtime2/<id>.spec  same, split into swell (primary) and wind-wave (secondary)
 * Missing values are written as "MM".
 */
import type { FeedResult, Source } from '../types.js';
import { compassToDeg, fetchText } from '../util.js';

export const BUOYS: Record<string, { name: string; cdip: string }> = {
  '51205': { name: 'Pauwela buoy, Maui', cdip: '187' },
  '51213': { name: 'Lanai Southwest buoy', cdip: '239' },
};

/** A Waverider reports every 30 min; older than this and we call it stale. */
export const BUOY_STALE_HOURS = 2;

export interface BuoyObservation {
  observedAt: string; // ISO UTC
  waveHeightM: number | null;
  dominantPeriodS: number | null;
  meanDirectionDeg: number | null;
  swell: { heightM: number | null; periodS: number | null; directionDeg: number | null } | null;
  windWave: { heightM: number | null; periodS: number | null; directionDeg: number | null } | null;
  waterTempC: number | null;
}

export function buoySource(id: string): Source {
  const b = BUOYS[id];
  return {
    name: `NDBC ${id}${b ? ` · ${b.name}` : ''}`,
    url: `https://www.ndbc.noaa.gov/station_page.php?station=${id}`,
  };
}

function num(v: string | undefined): number | null {
  if (v === undefined || v === 'MM') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Turn an NDBC realtime2 text file into header-keyed rows, newest first. */
export function parseNdbcTable(text: string): Record<string, string>[] {
  const lines = text.split('\n').filter((l) => l.trim());
  const header = lines.find((l) => l.startsWith('#'));
  if (!header) throw new Error('NDBC file has no header');
  const cols = header.replace(/^#/, '').trim().split(/\s+/);
  return lines
    .filter((l) => !l.startsWith('#'))
    .map((l) => {
      const parts = l.trim().split(/\s+/);
      const row: Record<string, string> = {};
      cols.forEach((c, i) => (row[c] = parts[i]));
      return row;
    });
}

function rowTime(r: Record<string, string>): string {
  return new Date(Date.UTC(+r.YY, +r.MM - 1, +r.DD, +r.hh, +r.mm)).toISOString();
}

/** Latest row of the standard met file (.txt) that has a wave height. */
export function parseStandard(text: string): BuoyObservation | null {
  const r = parseNdbcTable(text).find((row) => num(row.WVHT) !== null);
  if (!r) return null;
  return {
    observedAt: rowTime(r),
    waveHeightM: num(r.WVHT),
    dominantPeriodS: num(r.DPD),
    meanDirectionDeg: num(r.MWD),
    swell: null,
    windWave: null,
    waterTempC: num(r.WTMP),
  };
}

/** Latest row of the spectral summary file (.spec). */
export function parseSpec(text: string): Pick<BuoyObservation, 'observedAt' | 'swell' | 'windWave'> | null {
  const r = parseNdbcTable(text).find((row) => num(row.WVHT) !== null);
  if (!r) return null;
  return {
    observedAt: rowTime(r),
    swell: { heightM: num(r.SwH), periodS: num(r.SwP), directionDeg: compassToDeg(r.SwD ?? '') },
    windWave: { heightM: num(r.WWH), periodS: num(r.WWP), directionDeg: compassToDeg(r.WWD ?? '') },
  };
}

const BASE = 'https://www.ndbc.noaa.gov/data/realtime2';

export async function fetchBuoy(id: string, now = new Date()): Promise<FeedResult<BuoyObservation>> {
  const source = buoySource(id);
  const fetchedAt = now.toISOString();
  try {
    const [txt, spec] = await Promise.allSettled([fetchText(`${BASE}/${id}.txt`), fetchText(`${BASE}/${id}.spec`)]);
    if (txt.status === 'rejected') throw txt.reason;
    const obs = parseStandard(txt.value);
    if (!obs) return { status: 'unavailable', data: null, source, fetchedAt, error: 'No wave rows in buoy file' };
    // The swell/wind-wave split is a bonus: some buoys don't publish .spec.
    if (spec.status === 'fulfilled') {
      const s = parseSpec(spec.value);
      if (s && s.observedAt === obs.observedAt) {
        obs.swell = s.swell;
        obs.windWave = s.windWave;
      }
    }
    const age = (now.getTime() - new Date(obs.observedAt).getTime()) / 3_600_000;
    return { status: age > BUOY_STALE_HOURS ? 'stale' : 'ok', data: obs, source, fetchedAt };
  } catch (e) {
    return { status: 'unavailable', data: null, source, fetchedAt, error: (e as Error).message };
  }
}
