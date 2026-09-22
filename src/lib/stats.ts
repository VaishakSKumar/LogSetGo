import type { Exercise, Goal, HistoryEntry, MuscleGroup, SetMode, SetPerf, Session } from '../types';
import { addDays, daysBetween, weekStartKey } from './dates';
import { e1rm, isLogged, setKg, topSet, weekTotals, type WeekTotals } from './progress';

type Sessions = Record<string, Session>;

/* ─────────────────────────── Weekly volume ─────────────────────────── */

export interface WeekBucket extends WeekTotals {
  weekStart: string;
}

/** The last `weeks` weeks, oldest first, ending with the current week. */
export function weeklyBuckets(sessions: Sessions, todayKey: string, weeks: number): WeekBucket[] {
  const thisWeek = weekStartKey(todayKey);
  return Array.from({ length: weeks }, (_, i) => {
    const weekStart = addDays(thisWeek, -7 * (weeks - 1 - i));
    return { weekStart, ...weekTotals(sessions, weekStart) };
  });
}

/* ─────────────────────────── Records ─────────────────────────── */

export interface RecordRow {
  exerciseId: string;
  heaviest: SetPerf;
  heaviestDate: string;
  bestE1rm: number;
  bestE1rmDate: string;
}

/** All-time bests per exercise, most recently set first. */
export function recordsList(history: Record<string, HistoryEntry[]>): RecordRow[] {
  const rows: RecordRow[] = [];
  for (const [exerciseId, entries] of Object.entries(history)) {
    let heaviest: SetPerf | null = null;
    let heaviestDate = '';
    let bestE1rm = 0;
    let bestE1rmDate = '';
    // entries are newest first; iterate oldest→newest so a tie keeps the FIRST time it happened
    for (const entry of [...entries].reverse()) {
      for (const s of entry.sets) {
        if (!heaviest || s.weight > heaviest.weight || (s.weight === heaviest.weight && s.reps > heaviest.reps)) {
          heaviest = s;
          heaviestDate = entry.date;
        }
        const v = e1rm(s.weight, s.reps);
        if (v > bestE1rm + 1e-9) {
          bestE1rm = v;
          bestE1rmDate = entry.date;
        }
      }
    }
    if (heaviest) rows.push({ exerciseId, heaviest, heaviestDate, bestE1rm, bestE1rmDate });
  }
  return rows.sort((a, b) => (a.bestE1rmDate < b.bestE1rmDate ? 1 : a.bestE1rmDate > b.bestE1rmDate ? -1 : 0));
}

/** Best estimated 1RM of each session, oldest first. */
export function e1rmSeries(entries: HistoryEntry[] | undefined): { date: string; e1rm: number }[] {
  return [...(entries ?? [])]
    .reverse()
    .map((e) => ({ date: e.date, e1rm: Math.max(...e.sets.map((s) => e1rm(s.weight, s.reps))) }));
}

/* ─────────────────────────── Muscle split ─────────────────────────── */

export interface MuscleShare {
  group: MuscleGroup;
  sets: number;
  share: number;
}

/** Share of working sets per muscle group over the last `days` days. */
export function muscleSplit(sessions: Sessions, byId: Map<string, Exercise>, todayKey: string, days: number): MuscleShare[] {
  const since = addDays(todayKey, -days);
  const counts = new Map<MuscleGroup, number>();
  let total = 0;
  for (const [date, s] of Object.entries(sessions)) {
    if (date < since || date > todayKey) continue;
    for (const [id, rows] of Object.entries(s.exercises)) {
      const n = rows.filter(isLogged).length;
      if (!n) continue;
      const group = byId.get(id)?.group ?? 'Other';
      counts.set(group, (counts.get(group) ?? 0) + n);
      total += n;
    }
  }
  return [...counts.entries()]
    .map(([group, sets]) => ({ group, sets, share: total ? sets / total : 0 }))
    .sort((a, b) => b.sets - a.sets);
}

/* ─────────────────────────── Workout summary ─────────────────────────── */

export interface SummaryExercise {
  exerciseId: string;
  sets: number;
  /** kg. Always 0 for a time-based exercise. */
  volume: number;
  /** The heaviest (rep-based) or longest (time-based) set of the day. */
  top: SetPerf;
  pr: boolean;
  mode: SetMode;
}

export interface WorkoutSummary {
  date: string;
  label: string;
  exercises: SummaryExercise[];
  totalSets: number;
  totalVolume: number;
  prCount: number;
  /** minutes between the first and last logged set, or null with fewer than two timed sets */
  durationMin: number | null;
  /** vs your previous workout with the same label */
  vsLast: { date: string; volume: number; pct: number } | null;
}

const volumeOfSession = (s: Session) =>
  Object.values(s.exercises).reduce((sum, rows) => sum + rows.filter(isLogged).reduce((v, r) => v + setKg(r), 0), 0);

export function workoutSummary(sessions: Sessions, date: string): WorkoutSummary | null {
  const s = sessions[date];
  if (!s) return null;
  const exercises: SummaryExercise[] = [];
  const times: number[] = [];
  for (const [exerciseId, rows] of Object.entries(s.exercises)) {
    const logged = rows.filter(isLogged);
    if (!logged.length) continue;
    for (const r of logged) if (r.at) times.push(r.at);
    // "Top" set: heaviest for a rep-based exercise, longest hold for a time-based one — both are
    // "biggest weight, then biggest second number", so the same comparison works for either.
    const top = logged.reduce((a, b) => (b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a));
    exercises.push({
      exerciseId,
      sets: logged.length,
      volume: logged.reduce((v, r) => v + setKg(r), 0),
      top: { weight: top.weight, reps: top.reps },
      pr: logged.some((r) => r.pr),
      mode: logged[0].mode ?? 'reps',
    });
  }
  if (!exercises.length) return null;

  const totalVolume = exercises.reduce((v, e) => v + e.volume, 0);
  const previous = Object.keys(sessions)
    .filter((d) => d < date && sessions[d].label === s.label && volumeOfSession(sessions[d]) > 0)
    .sort()
    .pop();
  const prevVol = previous ? volumeOfSession(sessions[previous]) : 0;

  return {
    date,
    label: s.label,
    exercises,
    totalSets: exercises.reduce((n, e) => n + e.sets, 0),
    totalVolume,
    prCount: exercises.filter((e) => e.pr).length,
    durationMin: times.length >= 2 ? Math.max(1, Math.round((Math.max(...times) - Math.min(...times)) / 60_000)) : null,
    vsLast: previous ? { date: previous, volume: prevVol, pct: Math.round(((totalVolume - prevVol) / prevVol) * 100) } : null,
  };
}

/* ─────────────────────────── Goals ─────────────────────────── */

export interface GoalProgress {
  /** heaviest weight you've lifted (kg) */
  bestKg: number;
  /** 0-100 */
  pct: number;
  remainingKg: number;
  achieved: boolean;
  /** kg gained per week over your recent sessions, or null without enough data */
  slopeKgPerWeek: number | null;
  /** weeks to go at that pace, or null if there's no upward trend to project */
  etaWeeks: number | null;
  /** milestone weights (kg) from where you are to the goal */
  milestones: number[];
}

const MIN_SESSIONS_FOR_PACE = 3;

/**
 * Progress toward "lift X kg". Pace is a least-squares line through your top set of each of the
 * last 8 sessions, and it only projects when it has 3+ sessions spread over at least a week.
 */
export function goalProgress(goal: Goal, entries: HistoryEntry[] | undefined, stepKg: number): GoalProgress {
  const chrono = [...(entries ?? [])].reverse();
  const bestKg = chrono.reduce((m, e) => Math.max(m, topSet(e).weight), 0);
  const achieved = bestKg >= goal.targetKg;
  const remainingKg = Math.max(0, goal.targetKg - bestKg);

  let slope: number | null = null;
  const recent = chrono.slice(-8);
  if (recent.length >= MIN_SESSIONS_FOR_PACE && daysBetween(recent[0].date, recent[recent.length - 1].date) >= 7) {
    const xs = recent.map((e) => daysBetween(recent[0].date, e.date) / 7);
    const ys = recent.map((e) => topSet(e).weight);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
    slope = den > 0 ? xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / den : null;
  }

  const etaWeeks = !achieved && slope !== null && slope > 0.05 ? Math.ceil(remainingKg / slope) : null;

  // Up to 4 evenly spaced milestones, rounded to your plate step, always ending at the goal.
  const milestones: number[] = [];
  if (!achieved && remainingKg > 0) {
    const n = Math.min(4, Math.max(1, Math.round(remainingKg / stepKg)));
    for (let i = 1; i < n; i++) {
      const w = Math.round((bestKg + (remainingKg * i) / n) / stepKg) * stepKg;
      if (w > bestKg && w < goal.targetKg && !milestones.includes(w)) milestones.push(w);
    }
    milestones.push(goal.targetKg);
  }

  return {
    bestKg,
    pct: goal.targetKg > 0 ? Math.min(100, Math.round((bestKg / goal.targetKg) * 100)) : 0,
    remainingKg,
    achieved,
    slopeKgPerWeek: slope,
    etaWeeks,
    milestones,
  };
}
