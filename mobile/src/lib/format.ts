/** Hawaii is UTC-10 all year (no daylight saving), so we format by hand. */
const HST_OFFSET_MS = -10 * 3_600_000;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function hst(iso: string) {
  return new Date(new Date(iso).getTime() + HST_OFFSET_MS);
}

export function timeHST(iso: string | null): string {
  if (!iso) return '–';
  const d = hst(iso);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes().toString().padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h < 12 ? 'am' : 'pm'}`;
}

export function dayTimeHST(iso: string | null, now = new Date()): string {
  if (!iso) return '–';
  const d = hst(iso);
  const today = hst(now.toISOString());
  const sameDay = d.getUTCDate() === today.getUTCDate() && d.getUTCMonth() === today.getUTCMonth();
  if (sameDay) return `Today ${timeHST(iso)}`;
  // Within ~6 days a weekday is clear; beyond that show the date.
  if (Math.abs(d.getTime() - today.getTime()) < 6 * 86_400_000) return `${DAYS[d.getUTCDay()]} ${timeHST(iso)}`;
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()} ${timeHST(iso)}`;
}

export function ageLabel(hours: number | null): string {
  if (hours === null) return '';
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min ago`;
  if (hours < 48) return `${Math.round(hours)} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}
