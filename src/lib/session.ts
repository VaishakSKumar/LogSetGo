import type { SetPerf, SetRow, Session, Unit } from '../types';
import { isLogged } from './progress';
import { fmtWeight } from './units';

/** A finished set as shown on an exercise card, with the number it has in the entry table. */
export interface LoggedSet {
  row: SetRow;
  number: number;
}

export interface LoggedExercise {
  id: string;
  /** every completed set, warm-ups included, in table order */
  sets: LoggedSet[];
  /** completed working sets (warm-ups excluded) */
  workingSets: number;
  /** kg lifted in working sets */
  volume: number;
}

export interface DaySummary {
  exercises: number;
  sets: number;
  /** kg */
  volume: number;
}

/** kg lifted in the working sets of one exercise. Warm-ups never count. */
export const exerciseVolume = (rows: SetRow[]) => rows.reduce((sum, r) => (isLogged(r) ? sum + r.weight * r.reps : sum), 0);

/**
 * The exercises that have at least one completed set on a day, in the order you first logged them.
 * Exercises that only have empty rows (picked, or loaded from a routine) are not "logged" yet.
 */
export function loggedExercises(session: Session | undefined): LoggedExercise[] {
  if (!session) return [];
  const found: (LoggedExercise & { firstAt: number; order: number })[] = [];

  Object.entries(session.exercises).forEach(([id, rows], order) => {
    const sets = rows
      .map((row, i) => ({ row, number: i + 1 }))
      .filter(({ row }) => row.done && row.weight != null && row.reps != null);
    if (!sets.length) return;
    found.push({
      id,
      sets,
      workingSets: sets.filter((s) => !s.row.warmup).length,
      volume: exerciseVolume(rows),
      firstAt: Math.min(...sets.map((s) => s.row.at ?? Infinity)),
      order,
    });
  });

  found.sort((a, b) => (a.firstAt === b.firstAt ? a.order - b.order : a.firstAt - b.firstAt));
  return found.map(({ firstAt: _firstAt, order: _order, ...rest }) => rest);
}

/** Exercises, working sets and volume for the day. */
export function summarizeDay(session: Session | undefined): DaySummary {
  const logged = loggedExercises(session);
  return {
    exercises: logged.length,
    sets: logged.reduce((n, e) => n + e.workingSets, 0),
    volume: logged.reduce((v, e) => v + e.volume, 0),
  };
}

/** "60 × 8 · 60 × 8 · 60 × 7 · +2 more" (weights in `unit`). */
export function formatSets(sets: SetPerf[], unit: Unit, max = 3): string {
  const shown = sets.slice(0, max).map((s) => `${fmtWeight(s.weight, unit)} × ${s.reps}`);
  const rest = sets.length - shown.length;
  return rest > 0 ? `${shown.join(' · ')} · +${rest} more` : shown.join(' · ');
}
