export const M_TO_FT = 3.28084;

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

export function degToCompass(deg: number): string {
  return COMPASS[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}

export function compassToDeg(c: string): number | null {
  const i = COMPASS.indexOf(c.toUpperCase());
  return i === -1 ? null : i * 22.5;
}

export function ageHours(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  return Math.round(((now.getTime() - new Date(iso).getTime()) / 3_600_000) * 10) / 10;
}

/** "2026-11-27 22:00" (UTC, as NOAA returns with time_zone=gmt) → ISO. */
export function noaaGmtToIso(t: string): string {
  return new Date(t.replace(' ', 'T') + ':00Z').toISOString();
}

/** Is `deg` inside the arc from → to (clockwise, wrapping through north)? */
export function inArc(deg: number, from: number, to: number): boolean {
  const d = ((deg % 360) + 360) % 360;
  return from <= to ? d >= from && d <= to : d >= from || d <= to;
}

export async function fetchText(url: string, timeoutMs = 8000): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'User-Agent': 'maui-conditions-app/0.1 (open data client)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
  return res.text();
}
