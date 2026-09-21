const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date as YYYY-MM-DD. */
export function dateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parses at local noon so DST shifts never move the calendar day. */
export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(key: string, n: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

/** 0 = Monday … 6 = Sunday */
export function weekdayIndex(key: string): number {
  return (parseKey(key).getDay() + 6) % 7;
}

export function weekStartKey(key: string): string {
  return addDays(key, -weekdayIndex(key));
}

export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((parseKey(toKey).getTime() - parseKey(fromKey).getTime()) / 86_400_000);
}

/** "MON, SEP 21" */
export function headerDate(key: string): string {
  const d = parseKey(key);
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`.toUpperCase();
}

/** "Mon, Sep 21" */
export function shortDate(key: string): string {
  const d = parseKey(key);
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function weekRange(startKey: string): string {
  const a = parseKey(startKey);
  const b = parseKey(addDays(startKey, 6));
  return a.getMonth() === b.getMonth()
    ? `${MONTHS[a.getMonth()]} ${a.getDate()}–${b.getDate()}`
    : `${MONTHS[a.getMonth()]} ${a.getDate()} – ${MONTHS[b.getMonth()]} ${b.getDate()}`;
}

export function relativeDay(key: string, todayKey: string): string {
  const n = daysBetween(key, todayKey);
  if (n <= 0) return 'Today';
  if (n === 1) return 'Yesterday';
  if (n < 7) return `${n}d ago`;
  if (n < 30) return `${Math.floor(n / 7)}w ago`;
  return shortDate(key);
}

export const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
