export type Unit = 'kg' | 'lb';
export type MuscleGroup = 'Chest' | 'Back' | 'Shoulders' | 'Legs' | 'Arms' | 'Core' | 'Other';
export type Split = 'push' | 'pull' | 'legs' | 'other';

export interface Exercise {
  id: string;
  name: string;
  group: MuscleGroup;
  split: Split;
  aliases?: string[];
  custom?: boolean;
}

/** One row in the set table. Weight is always stored in kg. */
export interface SetRow {
  id: string;
  weight: number | null;
  reps: number | null;
  done: boolean;
  /** epoch ms when the set was logged */
  at?: number;
  /** true if this set beat every earlier set of the exercise (est. 1RM) */
  pr?: boolean;
  /** warm-up sets never count toward volume, PRs, history or suggestions */
  warmup?: boolean;
  /** rate of perceived exertion, 1-10 */
  rpe?: number;
  note?: string;
}

export interface Session {
  label: string;
  exercises: Record<string, SetRow[]>;
  /** free-text note per exercise for this day */
  notes?: Record<string, string>;
}

/** A saved workout: exercises in order, with how many sets to do. */
export interface Routine {
  id: string;
  name: string;
  items: { exerciseId: string; sets: number; reps?: number }[];
}

/** Target for an exercise: the heaviest weight (kg) you want to lift. */
export interface Goal {
  targetKg: number;
  /** YYYY-MM-DD */
  createdAt: string;
}

export interface Prefs {
  /** weight step for the +/- buttons and overload suggestions, in each unit */
  stepKg: number;
  stepLb: number;
}

export const DEFAULT_PREFS: Prefs = { stepKg: 2.5, stepLb: 5 };

export interface AppData {
  version: 1;
  unit: Unit;
  activeExerciseId: string | null;
  customExercises: Exercise[];
  /** keyed by local date, YYYY-MM-DD */
  sessions: Record<string, Session>;
  routines: Routine[];
  /** keyed by exercise id */
  goals: Record<string, Goal>;
  prefs: Prefs;
}

export interface SetPerf {
  weight: number;
  reps: number;
}

export interface HistoryEntry {
  date: string;
  sets: SetPerf[];
}

export interface Ghost {
  weight: number | null;
  reps: number | null;
}
