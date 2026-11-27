// Copied from server/lib/types.ts. Keep the two in sync (a shared package can replace this later).
/**
 * Shared shapes for everything the API returns.
 *
 * Product rule: every number shown to a diver or fisherman says what kind of
 * number it is (measured / forecast / estimate / computed), where it came from,
 * and how old it is. Nothing is shown without those three things.
 */

export type ReadingKind = 'measured' | 'forecast' | 'estimate' | 'computed';

export interface Source {
  /** Short human name, e.g. "NOAA CO-OPS Kahului (1615680)". */
  name: string;
  /** Link a curious user can open to check the raw data. */
  url: string;
}

export interface Reading<T = number> {
  label: string;
  value: T | null;
  unit?: string;
  /** Pre-formatted text for display, e.g. "4.6 ft @ 14 s from NW". */
  display: string;
  kind: ReadingKind;
  source: Source;
  /** When the value was observed or is valid for (ISO 8601, UTC). */
  observedAt: string | null;
  /** True when the value is older than the source's freshness limit. */
  stale: boolean;
  /** Age of observedAt in hours at response time (null for forecasts). */
  ageHours: number | null;
  note?: string;
}

export type FeedStatus = 'ok' | 'stale' | 'cached' | 'unavailable';

export interface FeedResult<T> {
  status: FeedStatus;
  data: T | null;
  source: Source;
  fetchedAt: string;
  error?: string;
}

export type Activity = 'dive' | 'fish';

export interface Spot {
  id: string;
  name: string;
  area: string;
  activities: Activity[];
  lat: number;
  lon: number;
  /** NDBC id of the wave buoy that best represents swell reaching this spot. */
  buoyId: string;
  /** Compass directions (deg true) of open ocean this spot is exposed to. */
  exposure: { from: number; to: number };
  /** Short local-knowledge notes shown on the spot page. */
  notes?: string;
}

export interface TideEvent {
  time: string; // ISO UTC
  heightFt: number;
  type: 'high' | 'low';
}

export interface ClarityEstimate {
  rating: 'Murky' | 'Poor' | 'Fair' | 'Good' | 'Excellent';
  /** 1 (Murky) … 5 (Excellent). */
  score: number;
  confidence: 'Low' | 'Medium' | 'High';
  reasons: string[];
}

export interface SpotConditions {
  spot: Spot;
  generatedAt: string;
  clarity: Reading<ClarityEstimate> | null;
  swell: {
    significant: Reading | null;
    primary: Reading | null;
    secondary: Reading | null;
  };
  tide: {
    now: Reading | null;
    next: TideEvent[];
    source: Source;
    status: FeedStatus;
  };
  sunMoon: {
    sunrise: string | null;
    sunset: string | null;
    moonPhase: string;
    moonIllumination: number;
    source: Source;
  };
  /** Feeds that are down or stale, so the app can show a banner. */
  warnings: string[];
  disclaimer: string;
}
