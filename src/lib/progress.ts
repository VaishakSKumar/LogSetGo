import type { Ghost, HistoryEntry, SetPerf, SetRow, Session, Split, Unit } from '../types';
import { addDays, weekStartKey, weekdayIndex } from './dates';
import { fmtWeight, fromDisplay, stepFor } from './units';

type Sessions = Record<string, Session>;

/* ─────────────────────────── History ─────────────────────────── */

/** A finished set of either mode. Warm-ups are deliberately excluded from history, volume, PRs and suggestions. */
export const isLogged = (r: SetRow): r is SetRow & { weight: number; reps: number } =>
  r.done && r.weight != null && r.reps != null && !r.warmup;

/** A finished set is time-based when it says so; absent `mode` always means a rep set (older data). */
export const isTimeSet = (r: SetRow) => r.mode === 'time';

/** kg lifted by one logged set. Time-based sets never contribute — their second number is seconds, not reps. */
export const setKg = (r: SetRow & { weight: number; reps: number }) => (isTimeSet(r) ? 0 : r.weight * r.reps);

/**
 * Every completed **rep-based** set you've ever logged, per exercise, newest session first. This is
 * the strength history: e1RM, PRs, progressive-overload suggestions, records and goals all read from
 * it, so a time-based set (its "reps" is really a duration) never gets treated as a 45-rep set.
 * Time-based sets have their own parallel history — see `buildDurationHistory`.
 */
export function buildHistory(sessions: Sessions): Record<string, HistoryEntry[]> {
  return buildHistoryOf(sessions, (r) => !isTimeSet(r));
}

/**
 * The rep-shaped history of time-based sets only (weight + duration-in-seconds as `reps`), used for
 * "last time" ghosts and the hold-based Progress panel — never for e1RM/PR/kg maths.
 */
export function buildDurationHistory(sessions: Sessions): Record<string, HistoryEntry[]> {
  return buildHistoryOf(sessions, isTimeSet);
}

function buildHistoryOf(sessions: Sessions, matches: (r: SetRow) => boolean): Record<string, HistoryEntry[]> {
  const out: Record<string, HistoryEntry[]> = {};
  for (const date of Object.keys(sessions).sort().reverse()) {
    for (const [exerciseId, rows] of Object.entries(sessions[date].exercises)) {
      const sets = rows.filter((r) => isLogged(r) && matches(r)).map((r) => ({ weight: r.weight!, reps: r.reps! }));
      if (sets.length) (out[exerciseId] ??= []).push({ date, sets });
    }
  }
  return out;
}

/** Most recent session strictly before `todayKey`. */
export const previousEntry = (history: HistoryEntry[] | undefined, todayKey: string) =>
  history?.find((h) => h.date < todayKey);

export interface RecentExercise {
  id: string;
  lastDate: string;
  lastAt: number;
}

/** Exercises ordered by when you last logged them. */
export function buildRecents(sessions: Sessions): RecentExercise[] {
  const map = new Map<string, RecentExercise>();
  for (const date of Object.keys(sessions).sort().reverse()) {
    for (const [id, rows] of Object.entries(sessions[date].exercises)) {
      const done = rows.filter((r) => r.done);
      if (!done.length || map.has(id)) continue;
      map.set(id, { id, lastDate: date, lastAt: Math.max(0, ...done.map((r) => r.at ?? 0)) });
    }
  }
  return [...map.values()].sort((a, b) =>
    a.lastDate === b.lastDate ? b.lastAt - a.lastAt : a.lastDate < b.lastDate ? 1 : -1,
  );
}

/* ─────────────────────────── Strength maths ─────────────────────────── */

/** Epley estimated one-rep max. */
export const e1rm = (weight: number, reps: number) => (reps <= 1 ? weight : weight * (1 + reps / 30));

export interface Bests {
  heaviest: SetPerf;
  e1rm: number;
}

export function bestsOf(history: HistoryEntry[] | undefined): Bests | null {
  if (!history?.length) return null;
  let heaviest: SetPerf | null = null;
  let best = 0;
  for (const h of history) {
    for (const s of h.sets) {
      if (!heaviest || s.weight > heaviest.weight || (s.weight === heaviest.weight && s.reps > heaviest.reps)) {
        heaviest = s;
      }
      best = Math.max(best, e1rm(s.weight, s.reps));
    }
  }
  return heaviest ? { heaviest, e1rm: best } : null;
}

/** Best e1RM among logged rep-based sets of an exercise, ignoring one row (the one being logged). */
export function bestE1rmExcluding(sessions: Sessions, exerciseId: string, excludeRowId: string, excludeDate: string) {
  let best = 0;
  let any = false;
  for (const [date, session] of Object.entries(sessions)) {
    for (const r of session.exercises[exerciseId] ?? []) {
      if (!isLogged(r) || isTimeSet(r) || (date === excludeDate && r.id === excludeRowId)) continue;
      any = true;
      best = Math.max(best, e1rm(r.weight, r.reps));
    }
  }
  return any ? best : null;
}

/** Longest hold (seconds) among logged time-based sets of an exercise, ignoring one row — the time-mode analog of `bestE1rmExcluding`. */
export function bestDurationExcluding(sessions: Sessions, exerciseId: string, excludeRowId: string, excludeDate: string) {
  let best = 0;
  let any = false;
  for (const [date, session] of Object.entries(sessions)) {
    for (const r of session.exercises[exerciseId] ?? []) {
      if (!isLogged(r) || !isTimeSet(r) || (date === excludeDate && r.id === excludeRowId)) continue;
      any = true;
      best = Math.max(best, r.reps);
    }
  }
  return any ? best : null;
}

export const topSet = (entry: HistoryEntry): SetPerf =>
  entry.sets.reduce((a, b) => (b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a));

export const volumeOf = (sets: SetPerf[]) => sets.reduce((sum, s) => sum + s.weight * s.reps, 0);

/* ─────────────────────────── Ghost autofill ─────────────────────────── */

/**
 * The grey "tap to accept" values for row `index`.
 * Default: mirror what you did on the same set last session. If you just deviated
 * from history on the previous set today (heavier/lighter), carry that weight forward.
 * With no history at all, repeat the set you just logged.
 */
export function ghostFor(index: number, rows: SetRow[], prev: SetPerf[] | undefined): Ghost {
  const before = rows.slice(0, index);
  const lastDone = [...before].reverse().find(isLogged);
  const fromPrev = prev?.[index] ?? (prev && prev.length ? prev[prev.length - 1] : undefined);

  let weight: number | null = fromPrev?.weight ?? lastDone?.weight ?? null;
  const reps: number | null = fromPrev?.reps ?? lastDone?.reps ?? null;

  if (lastDone && prev && prev.length) {
    const counterpart = prev[index - 1] ?? prev[prev.length - 1];
    if (counterpart && lastDone.weight !== counterpart.weight) weight = lastDone.weight;
  }
  return { weight, reps };
}

/** What a tap on the checkmark will log: typed values, falling back to the grey ghost. */
export function resolveSet(row: SetRow, ghost: Ghost): SetPerf | null {
  const weight = row.weight ?? ghost.weight;
  const reps = row.reps ?? ghost.reps;
  return weight == null || reps == null || reps < 1 ? null : { weight, reps };
}

/* ─────────────────────────── Progressive overload ─────────────────────────── */

export interface Suggestion {
  sets: SetPerf[];
  headline: string;
  reason: string;
  kind: 'weight' | 'reps' | 'match';
}

const REP_CEILING = 12;
const REP_RESET = 8;
const STRENGTH_REPS = 6;

/**
 * Explainable double-progression:
 *  · every top set ≥ 12 reps          → add a plate jump, restart at 8
 *  · all top sets equal, ≤ 6 reps     → add a plate jump (strength range)
 *  · all top sets equal, 7–11 reps    → add one rep per set
 *  · uneven top sets                  → bring every set up to your best set
 */
export function suggestNext(prev: SetPerf[], unit: Unit, step: number = stepFor(unit)): Suggestion | null {
  if (!prev.length) return null;
  const topW = Math.max(...prev.map((s) => s.weight));
  const top = prev.filter((s) => s.weight === topW);
  const minReps = Math.min(...top.map((s) => s.reps));
  const maxReps = Math.max(...top.map((s) => s.reps));
  const jump = fromDisplay(step, unit);
  const label = (w: number, r: number) => `${fmtWeight(w, unit)} ${unit} × ${r}`;

  const apply = (fn: (s: SetPerf) => SetPerf) => prev.map((s) => (s.weight === topW ? fn(s) : s));

  if (minReps >= REP_CEILING) {
    return {
      kind: 'weight',
      sets: apply(() => ({ weight: topW + jump, reps: REP_RESET })),
      headline: label(topW + jump, REP_RESET),
      reason: `You hit ${minReps}+ reps on every set. Add weight and rebuild from ${REP_RESET}.`,
    };
  }
  if (minReps === maxReps && minReps <= STRENGTH_REPS) {
    return {
      kind: 'weight',
      sets: apply((s) => ({ weight: topW + jump, reps: s.reps })),
      headline: label(topW + jump, minReps),
      reason: `Every set landed on ${minReps} reps. Time to add ${fmtWeight(jump, unit)} ${unit}.`,
    };
  }
  if (minReps === maxReps) {
    const next = Math.min(REP_CEILING, minReps + 1);
    return {
      kind: 'reps',
      sets: apply((s) => ({ weight: s.weight, reps: Math.min(REP_CEILING, s.reps + 1) })),
      headline: label(topW, next),
      reason: `Same weight, one more rep per set. Weight goes up at ${REP_CEILING}.`,
    };
  }
  return {
    kind: 'match',
    sets: apply((s) => ({ weight: s.weight, reps: maxReps })),
    headline: label(topW, maxReps),
    reason: `Your sets ranged ${minReps}–${maxReps}. Bring every set up to ${maxReps}.`,
  };
}

/* ─────────────────────────── Weekly rollups ─────────────────────────── */

export interface WeekTotals {
  volume: number;
  sets: number;
  workouts: number;
}

/** Totals for the week beginning `startKey`, counting Monday through weekday `throughIdx`. */
export function weekTotals(sessions: Sessions, startKey: string, throughIdx = 6): WeekTotals {
  const t: WeekTotals = { volume: 0, sets: 0, workouts: 0 };
  for (let i = 0; i <= throughIdx; i++) {
    const session = sessions[addDays(startKey, i)];
    if (!session) continue;
    let any = false;
    for (const rows of Object.values(session.exercises)) {
      for (const r of rows.filter(isLogged)) {
        t.volume += setKg(r);
        t.sets += 1;
        any = true;
      }
    }
    if (any) t.workouts += 1;
  }
  return t;
}

/** 7 booleans, Monday first: did you log anything that day? */
export function trainedDays(sessions: Sessions, startKey: string): boolean[] {
  return Array.from({ length: 7 }, (_, i) => {
    const s = sessions[addDays(startKey, i)];
    return !!s && Object.values(s.exercises).some((rows) => rows.some(isLogged));
  });
}

export const WEEKLY_GOAL = 3;

/** Consecutive weeks with at least WEEKLY_GOAL workouts. The current week counts once it's met. */
export function streakWeeks(sessions: Sessions, todayKey: string): number {
  let start = weekStartKey(todayKey);
  let streak = 0;
  if (weekTotals(sessions, start).workouts >= WEEKLY_GOAL) streak++;
  for (let i = 0; i < 104; i++) {
    start = addDays(start, -7);
    if (weekTotals(sessions, start).workouts < WEEKLY_GOAL) break;
    streak++;
  }
  return streak;
}

/* ─────────────────────────── Workout day labels ─────────────────────────── */

export const DAY_LABELS = ['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B', 'Upper', 'Lower', 'Full Body'];

const DEFAULT_WEEK = ['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B', 'Full Body'];
export const defaultLabelFor = (key: string) => DEFAULT_WEEK[weekdayIndex(key)];

export function splitsOfLabel(label: string): Split[] {
  const l = label.toLowerCase();
  if (l.includes('push')) return ['push'];
  if (l.includes('pull')) return ['pull'];
  if (l.includes('leg') || l.includes('lower')) return ['legs'];
  if (l.includes('upper')) return ['push', 'pull'];
  return ['push', 'pull', 'legs', 'other'];
}
