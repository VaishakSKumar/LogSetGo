import type { SetMode, SetPerf, SetRow, Session, Unit } from '../types';
import { formatDuration } from './duration';
import { isLogged, isTimeSet, setKg } from './progress';
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
  /** kg lifted in working sets. Always 0 for a time-based exercise — see `tutSeconds`. */
  volume: number;
  /** How the day's sets of this exercise were logged. From the first completed set; 'reps' when there are none yet. */
  mode: SetMode;
  /** Seconds under tension across working time-based sets. 0 for a rep-based exercise. */
  tutSeconds: number;
}

export interface DaySummary {
  exercises: number;
  sets: number;
  /** kg. Time-based sets never contribute, the same way warm-ups don't. */
  volume: number;
}

/** kg lifted in the working sets of one exercise. Warm-ups, and every time-based set, never count. */
export const exerciseVolume = (rows: SetRow[]) => rows.reduce((sum, r) => (isLogged(r) ? sum + setKg(r) : sum), 0);

/** Seconds under tension across the working time-based sets of one exercise. */
export const exerciseTut = (rows: SetRow[]) => rows.reduce((sum, r) => (isLogged(r) && isTimeSet(r) ? sum + r.reps! : sum), 0);

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
      mode: sets[0].row.mode ?? 'reps',
      tutSeconds: exerciseTut(rows),
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

/**
 * "60 × 8 · 60 × 8 · 60 × 7 · +2 more" for rep-based sets (weights in `unit`).
 * For time-based sets: "0:45 · 0:45 · +1 more", with the weight folded in only when it's non-zero
 * ("5 kg for 0:45"), since most holds are pure bodyweight and repeating "0 kg" on every set is noise.
 */
export function formatSets(sets: SetPerf[], unit: Unit, mode: SetMode = 'reps', max = 3): string {
  const one = (s: SetPerf) =>
    mode === 'time' ? (s.weight > 0 ? `${fmtWeight(s.weight, unit)} ${unit} for ${formatDuration(s.reps)}` : formatDuration(s.reps)) : `${fmtWeight(s.weight, unit)} × ${s.reps}`;
  const shown = sets.slice(0, max).map(one);
  const rest = sets.length - shown.length;
  return rest > 0 ? `${shown.join(' · ')} · +${rest} more` : shown.join(' · ');
}
