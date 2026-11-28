/**
 * NOAA CO-OPS tides for Kahului Harbor (station 1615680), the only NOAA
 * water-level station on Maui.
 *
 *   predictions (interval=hilo)  forecast high/low times and heights
 *   water_level (date=latest)    measured level, updated every 6 min
 *
 * All requests use time_zone=gmt so times are unambiguous; the app converts
 * to Hawaii time for display. Heights are feet above MLLW.
 */
import type { FeedResult, Source, TideEvent } from '../types.js';
import { fetchText, noaaGmtToIso } from '../util.js';

export const KAHULUI = '1615680';
const API = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
/** Water level posts every 6 min; an hour without one is stale. */
export const TIDE_STALE_HOURS = 1;

export function tideSource(station = KAHULUI): Source {
  return {
    name: `NOAA CO-OPS · Kahului Harbor (${station})`,
    url: `https://tidesandcurrents.noaa.gov/stationhome.html?id=${station}`,
  };
}

export function parseHiLo(json: string): TideEvent[] {
  const body = JSON.parse(json) as { predictions?: { t: string; v: string; type: 'H' | 'L' }[]; error?: { message: string } };
  if (body.error) throw new Error(body.error.message);
  return (body.predictions ?? []).map((p) => ({
    time: noaaGmtToIso(p.t),
    heightFt: Number(p.v),
    type: p.type === 'H' ? 'high' : 'low',
  }));
}

export interface WaterLevel {
  observedAt: string;
  heightFt: number;
}

export function parseLatestLevel(json: string): WaterLevel | null {
  const body = JSON.parse(json) as { data?: { t: string; v: string }[]; error?: { message: string } };
  if (body.error) throw new Error(body.error.message);
  const d = body.data?.[0];
  if (!d || d.v === '') return null;
  return { observedAt: noaaGmtToIso(d.t), heightFt: Number(d.v) };
}

function ymd(d: Date) {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

export async function fetchTidePredictions(now = new Date(), station = KAHULUI): Promise<FeedResult<TideEvent[]>> {
  const source = tideSource(station);
  const begin = new Date(now.getTime() - 24 * 3_600_000);
  const end = new Date(now.getTime() + 48 * 3_600_000);
  const url =
    `${API}?station=${station}&product=predictions&datum=MLLW&units=english&time_zone=gmt` +
    `&interval=hilo&format=json&application=maui_conditions&begin_date=${ymd(begin)}&end_date=${ymd(end)}`;
  try {
    return { status: 'ok', data: parseHiLo(await fetchText(url)), source, fetchedAt: now.toISOString() };
  } catch (e) {
    return { status: 'unavailable', data: null, source, fetchedAt: now.toISOString(), error: (e as Error).message };
  }
}

export async function fetchWaterLevel(now = new Date(), station = KAHULUI): Promise<FeedResult<WaterLevel>> {
  const source = tideSource(station);
  const url =
    `${API}?station=${station}&product=water_level&datum=MLLW&units=english&time_zone=gmt` +
    `&format=json&application=maui_conditions&date=latest`;
  try {
    const level = parseLatestLevel(await fetchText(url));
    if (!level) return { status: 'unavailable', data: null, source, fetchedAt: now.toISOString(), error: 'No latest reading' };
    const age = (now.getTime() - new Date(level.observedAt).getTime()) / 3_600_000;
    return { status: age > TIDE_STALE_HOURS ? 'stale' : 'ok', data: level, source, fetchedAt: now.toISOString() };
  } catch (e) {
    return { status: 'unavailable', data: null, source, fetchedAt: now.toISOString(), error: (e as Error).message };
  }
}
