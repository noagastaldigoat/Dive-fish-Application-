import * as suncalcNs from 'suncalc';

// suncalc is CommonJS; under Node ESM its API sits on `default`.
const SunCalc: typeof suncalcNs = (suncalcNs as unknown as { default?: typeof suncalcNs }).default ?? suncalcNs;

export function moonPhaseName(phase: number): string {
  // phase: 0 new → 0.25 first quarter → 0.5 full → 0.75 last quarter
  if (phase < 0.03 || phase > 0.97) return 'New moon';
  if (phase < 0.22) return 'Waxing crescent';
  if (phase < 0.28) return 'First quarter';
  if (phase < 0.47) return 'Waxing gibbous';
  if (phase < 0.53) return 'Full moon';
  if (phase < 0.72) return 'Waning gibbous';
  if (phase < 0.78) return 'Last quarter';
  return 'Waning crescent';
}

/** Hawaii is UTC-10 with no daylight saving, so "today" is easy to pin down. */
export function hawaiiNoon(now: Date): Date {
  const hst = new Date(now.getTime() - 10 * 3_600_000);
  return new Date(Date.UTC(hst.getUTCFullYear(), hst.getUTCMonth(), hst.getUTCDate(), 22, 0)); // 12:00 HST
}

export function sunMoon(lat: number, lon: number, now = new Date()) {
  const day = hawaiiNoon(now);
  const t = SunCalc.getTimes(day, lat, lon);
  const m = SunCalc.getMoonIllumination(now);
  const valid = (d: Date | null) => (!d || isNaN(d.getTime()) ? null : d.toISOString());
  return {
    sunrise: valid(t.sunrise),
    sunset: valid(t.sunset),
    moonPhase: moonPhaseName(m.phase),
    moonIllumination: Math.round(m.fraction * 100),
  };
}
