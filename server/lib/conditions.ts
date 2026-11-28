import type { FeedResult, Reading, Spot, SpotConditions, TideEvent } from './types.js';
import { BUOY_STALE_HOURS, fetchBuoy, type BuoyObservation } from './feeds/ndbc.js';
import { TIDE_STALE_HOURS, fetchTidePredictions, fetchWaterLevel, tideSource, type WaterLevel } from './feeds/tides.js';
import { estimateClarity } from './clarity.js';
import { sunMoon } from './astro.js';
import { cachedFeed } from './cache.js';
import { M_TO_FT, ageHours, degToCompass } from './util.js';

export const DISCLAIMER =
  'Planning information only, not a guarantee of conditions. Ocean conditions change quickly. ' +
  'Always check the water yourself, follow lifeguard and NWS warnings, and never dive or fish alone.';

const MIN = 60_000;
/** Past this, swell data is too old to say anything useful about clarity. */
export const CLARITY_MAX_INPUT_AGE_HOURS = 12;

export interface Feeds {
  buoy: (id: string, now: Date) => Promise<FeedResult<BuoyObservation>>;
  tides: (now: Date) => Promise<FeedResult<TideEvent[]>>;
  waterLevel: (now: Date) => Promise<FeedResult<WaterLevel>>;
}

export const liveFeeds: Feeds = {
  buoy: (id, now) => cachedFeed(`buoy:${id}`, 10 * MIN, () => fetchBuoy(id, now), now.getTime()),
  tides: (now) => cachedFeed('tides:kahului', 60 * MIN, () => fetchTidePredictions(now), now.getTime()),
  waterLevel: (now) => cachedFeed('level:kahului', 5 * MIN, () => fetchWaterLevel(now), now.getTime()),
};

function waveReading(
  label: string,
  heightM: number | null,
  periodS: number | null,
  dirDeg: number | null,
  obs: BuoyObservation,
  stale: boolean,
  feed: FeedResult<BuoyObservation>,
  now: Date,
): Reading | null {
  if (heightM === null) return null;
  const ft = heightM * M_TO_FT;
  const parts = [`${ft.toFixed(1)} ft`];
  if (periodS !== null) parts.push(`@ ${Math.round(periodS)} s`);
  if (dirDeg !== null) parts.push(`from ${degToCompass(dirDeg)}`);
  return {
    label,
    value: Math.round(ft * 10) / 10,
    unit: 'ft',
    display: parts.join(' '),
    kind: 'measured',
    source: feed.source,
    observedAt: obs.observedAt,
    stale,
    ageHours: ageHours(obs.observedAt, now),
    note: feed.status === 'cached' ? 'Buoy feed is down; showing the last value we received.' : undefined,
  };
}

export async function buildConditions(spot: Spot, now = new Date(), feeds: Feeds = liveFeeds): Promise<SpotConditions> {
  const [picked, tides, level] = await Promise.all([pickBuoy(spot, now, feeds), feeds.tides(now), feeds.waterLevel(now)]);
  const buoy = picked.feed;
  const warnings: string[] = [...picked.warnings];

  // ---- Swell -------------------------------------------------------------
  const obs = buoy.data;
  const buoyAge = obs ? ageHours(obs.observedAt, now) : null;
  const buoyStale = buoy.status !== 'ok' || (buoyAge ?? Infinity) > BUOY_STALE_HOURS;
  if (!obs) warnings.push(`${buoy.source.name} is not reporting right now.`);
  else if (buoyStale) warnings.push(`${buoy.source.name} last reported ${formatAge(buoyAge)} ago.`);

  const swell = {
    significant: obs ? waveReading('Wave height (all)', obs.waveHeightM, obs.dominantPeriodS, obs.meanDirectionDeg, obs, buoyStale, buoy, now) : null,
    primary: obs?.swell ? waveReading('Primary swell', obs.swell.heightM, obs.swell.periodS, obs.swell.directionDeg, obs, buoyStale, buoy, now) : null,
    secondary: obs?.windWave ? waveReading('Wind swell', obs.windWave.heightM, obs.windWave.periodS, obs.windWave.directionDeg, obs, buoyStale, buoy, now) : null,
  };

  // ---- Clarity (estimate) ------------------------------------------------
  let clarity: SpotConditions['clarity'] = null;
  if (obs && (buoyAge ?? Infinity) > CLARITY_MAX_INPUT_AGE_HOURS) {
    clarity = {
      label: 'Water clarity',
      value: null,
      display: 'Unknown',
      kind: 'estimate',
      source: { name: 'Estimated by this app from buoy swell', url: buoy.source.url },
      observedAt: obs.observedAt,
      stale: true,
      ageHours: buoyAge,
      note: `No estimate: the buoy data it needs is ${formatAge(buoyAge)} old.`,
    };
  } else if (obs) {
    const est = estimateClarity(spot, obs, buoyStale);
    clarity = {
      label: 'Water clarity',
      value: est,
      display: est.rating,
      kind: 'estimate',
      source: { name: 'Estimated by this app from buoy swell', url: buoy.source.url },
      observedAt: obs.observedAt,
      stale: buoyStale,
      ageHours: buoyAge,
      note: 'Rule-of-thumb estimate, not a measurement.',
    };
  }

  // ---- Tide --------------------------------------------------------------
  const lvl = level.data;
  const levelAge = lvl ? ageHours(lvl.observedAt, now) : null;
  const tideNow: Reading | null = lvl
    ? {
        label: 'Water level now (Kahului)',
        value: lvl.heightFt,
        unit: 'ft',
        display: `${lvl.heightFt.toFixed(1)} ft`,
        kind: 'measured',
        source: level.source,
        observedAt: lvl.observedAt,
        stale: level.status === 'cached' || (levelAge ?? Infinity) > TIDE_STALE_HOURS,
        ageHours: levelAge,
      }
    : null;
  if (!tides.data) warnings.push('Tide predictions are unavailable right now.');
  const nowIso = now.toISOString();
  const next = (tides.data ?? []).filter((t) => t.time >= nowIso).slice(0, 4);

  return {
    spot,
    generatedAt: nowIso,
    clarity,
    swell,
    tide: { now: tideNow, next, source: tideSource(), status: tides.status },
    sunMoon: {
      ...sunMoon(spot.lat, spot.lon, now),
      source: { name: 'Calculated (astronomical)', url: 'https://github.com/mourner/suncalc' },
    },
    warnings,
    disclaimer: DISCLAIMER,
  };
}

/**
 * Use the spot's own buoy when it is fresh; otherwise the first fresh backup;
 * otherwise whatever we have (the app then shows it as old data).
 */
async function pickBuoy(spot: Spot, now: Date, feeds: Feeds) {
  const isFresh = (f: FeedResult<BuoyObservation>) =>
    f.status === 'ok' && !!f.data && (ageHours(f.data.observedAt, now) ?? Infinity) <= BUOY_STALE_HOURS;
  const main = await feeds.buoy(spot.buoyId, now);
  if (isFresh(main) || spot.backupBuoyIds.length === 0) return { feed: main, warnings: [] as string[] };

  const backups = await Promise.all(spot.backupBuoyIds.map((id) => feeds.buoy(id, now)));
  const backup = backups.find(isFresh);
  if (!backup) return { feed: main, warnings: [] as string[] };
  const why = main.data ? `last reported ${formatAge(ageHours(main.data.observedAt, now))} ago` : 'is offline';
  return {
    feed: backup,
    warnings: [
      `${main.source.name} ${why}. Swell below is from ${backup.source.name} instead, which only roughly matches this spot.`,
    ],
  };
}

function formatAge(h: number | null): string {
  if (h === null) return 'a while';
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} days`;
}
