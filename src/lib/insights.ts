import type { HistoryEntry, SetMode } from '../types';
import type { StatusMap } from './attendance';
import type { WeightEntry } from './body';
import { addDays, daysBetween, weekStartKey } from './dates';

/* ─────────────────────────── Attendance ─────────────────────────── */

export interface WeekProgress {
  /** days marked Present this week */
  done: number;
  goal: number;
  /** done minus last week's days */
  change: number;
  /** progress toward the goal, 0-100 */
  percent: number;
}

const presentInWeek = (statuses: StatusMap, weekStart: string) => {
  let days = 0;
  for (let i = 0; i < 7; i++) if (statuses[addDays(weekStart, i)] === 'present') days++;
  return days;
};

export function weekProgress(statuses: StatusMap, today: string, goal: number): WeekProgress {
  const start = weekStartKey(today);
  const done = presentInWeek(statuses, start);
  return {
    done,
    goal,
    change: done - presentInWeek(statuses, addDays(start, -7)),
    percent: Math.min(100, Math.round((done / goal) * 100)),
  };
}

export interface MonthProgress {
  present: number;
  absent: number;
  holiday: number;
  /** present + absent: holidays don't count against you */
  counted: number;
  /** out of 100, or null when no day counted */
  rate: number | null;
}

export function monthProgress(statuses: StatusMap, month: string): MonthProgress {
  const prefix = month.slice(0, 7);
  let present = 0;
  let absent = 0;
  let holiday = 0;
  for (const [date, status] of Object.entries(statuses)) {
    if (date.slice(0, 7) !== prefix) continue;
    if (status === 'present') present++;
    else if (status === 'absent') absent++;
    else holiday++;
  }
  const counted = present + absent;
  return { present, absent, holiday, counted, rate: counted ? Math.round((present / counted) * 100) : null };
}

/** The longest run of Present days. As with the current streak, a Holiday keeps a run alive without adding to it. */
export function bestStreak(statuses: StatusMap): number {
  const dates = Object.keys(statuses).sort();
  if (!dates.length) return 0;
  const last = dates[dates.length - 1];
  let best = 0;
  let run = 0;
  for (let d = dates[0]; d <= last; d = addDays(d, 1)) {
    const status = statuses[d];
    if (status === 'present') best = Math.max(best, ++run);
    else if (status !== 'holiday') run = 0;
  }
  return best;
}

/** Present ÷ (Present + Absent) over the last `days` days, or null with nothing marked. */
export function recentRate(statuses: StatusMap, today: string, days = 30): number | null {
  let present = 0;
  let counted = 0;
  for (let i = 0; i < days; i++) {
    const status = statuses[addDays(today, -i)];
    if (status === 'present') present++;
    if (status === 'present' || status === 'absent') counted++;
  }
  return counted ? Math.round((present / counted) * 100) : null;
}

/* ─────────────────────────── Weight ─────────────────────────── */

export type WeightRange = 'm1' | 'm3' | 'all';

const RANGE_DAYS: Record<Exclude<WeightRange, 'all'>, number> = { m1: 30, m3: 91 };

/** Entries inside the range, oldest first. */
export function weightsInRange(entries: WeightEntry[], today: string, range: WeightRange): WeightEntry[] {
  if (range === 'all') return entries;
  const from = addDays(today, -RANGE_DAYS[range]);
  return entries.filter((e) => e.date >= from);
}

export interface GoalProgress {
  /** 0-100 from your first logged weight to the goal */
  percent: number;
  /** kg still to go */
  left: number;
  direction: 'lose' | 'gain' | 'reached';
}

export function goalProgress(startKg: number, currentKg: number, goalKg: number): GoalProgress {
  const left = Math.abs(currentKg - goalKg);
  if (left < 0.05) return { percent: 100, left: 0, direction: 'reached' };
  const total = Math.abs(startKg - goalKg);
  const percent = total > 0 ? Math.max(0, Math.min(100, Math.round((1 - left / total) * 100))) : 0;
  return { percent, left, direction: goalKg < currentKg ? 'lose' : 'gain' };
}

/* ─────────────────────────── Week by week ─────────────────────────── */

export type WeekMetric = 'kg' | 'reps' | 'time';

export interface WeekBest {
  weekStart: string;
  /** whole weeks before this week */
  weeksAgo: number;
  weight: number;
  reps: number;
  /** what the graph plots: kg, or reps/seconds when no weight was used */
  value: number;
  pr: boolean;
}

export const WEEKS_SHOWN = 6;

/**
 * The best set of each week, oldest first, for the most recent weeks trained. A week is a PR when it
 * beats every earlier week, all of history included. The first week is only the baseline.
 */
export function weekBests(entries: HistoryEntry[] | undefined, today: string, mode: SetMode): { metric: WeekMetric; weeks: WeekBest[] } {
  const sets = (entries ?? []).flatMap((e) => e.sets.map((s) => ({ ...s, weekStart: weekStartKey(e.date) })));
  const metric: WeekMetric = mode === 'time' ? 'time' : sets.some((s) => s.weight > 0) ? 'kg' : 'reps';
  const valueOf = (s: { weight: number; reps: number }) => (metric === 'kg' ? s.weight : s.reps);

  const bests = new Map<string, (typeof sets)[number]>();
  for (const s of sets) {
    const held = bests.get(s.weekStart);
    if (!held || valueOf(s) > valueOf(held) || (valueOf(s) === valueOf(held) && s.reps > held.reps)) bests.set(s.weekStart, s);
  }

  const thisWeek = weekStartKey(today);
  let top = -Infinity;
  const weeks = [...bests.values()]
    .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1))
    .map((s, i) => {
      const value = valueOf(s);
      const pr = i > 0 && value > top;
      top = Math.max(top, value);
      return { weekStart: s.weekStart, weeksAgo: Math.round(daysBetween(s.weekStart, thisWeek) / 7), weight: s.weight, reps: s.reps, value, pr };
    });
  return { metric, weeks: weeks.slice(-WEEKS_SHOWN) };
}

export const weeksAgoLabel = (n: number) => (n <= 0 ? 'This week' : n === 1 ? 'Last week' : `${n} weeks ago`);
