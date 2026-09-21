import { addDays, dateKey, parseKey, weekdayIndex } from './dates';

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const firstOfMonth = (key: string) => `${key.slice(0, 8)}01`;

/** Move a month key (any date in it) by `n` months; result is always the 1st. */
export function shiftMonth(key: string, n: number): string {
  const d = parseKey(firstOfMonth(key));
  d.setMonth(d.getMonth() + n);
  return dateKey(d);
}

export function daysInMonth(key: string): number {
  const d = parseKey(firstOfMonth(key));
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export const monthTitle = (key: string) => {
  const d = parseKey(key);
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
};

/** "Monday, September 21" */
export const longDate = (key: string) => {
  const d = parseKey(key);
  return `${DAYS_LONG[d.getDay()]}, ${MONTHS_LONG[d.getMonth()]} ${d.getDate()}`;
};

/** Day of month as a number. */
export const dayOfMonth = (key: string) => Number(key.slice(8, 10));

/**
 * Monday-first matrix, always 6 weeks tall so the layout never jumps between months.
 * Cells outside the month are `null`.
 */
export function monthGrid(monthKey: string): (string | null)[][] {
  const first = firstOfMonth(monthKey);
  const lead = weekdayIndex(first);
  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: daysInMonth(first) }, (_, i) => addDays(first, i)),
  ];
  while (cells.length < 42) cells.push(null);
  return Array.from({ length: 6 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}
