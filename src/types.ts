export type Unit = 'kg' | 'lb';
export type MuscleGroup = 'Chest' | 'Back' | 'Shoulders' | 'Legs' | 'Arms' | 'Core' | 'Cardio' | 'Other';
export type Split = 'push' | 'pull' | 'legs' | 'other';

/** 'time' means the set's second number is a duration in seconds, not a rep count. */
export type SetMode = 'reps' | 'time';

export interface Exercise {
  id: string;
  name: string;
  group: MuscleGroup;
  split: Split;
  aliases?: string[];
  custom?: boolean;
  /** The mode a freshly picked instance of this exercise starts in, before any personal override. */
  defaultMode?: SetMode;
}

/**
 * One row in the set table. Weight is always stored in kg.
 * `reps` doubles as the duration in seconds when `mode` is `'time'` — one numeric field, formatted
 * and parsed differently at the edges, so every existing weight×reps calculation keeps working
 * unchanged and simply treats a time-based set's number as "0 reps of a rep exercise" (harmless,
 * since kg volume, PRs and suggestions all explicitly skip `mode: 'time'` rows).
 */
export interface SetRow {
  id: string;
  weight: number | null;
  reps: number | null;
  done: boolean;
  /** epoch ms when the set was logged */
  at?: number;
  /** true if this set beat every earlier set of the exercise (est. 1RM, or longest hold for a time-based set) */
  pr?: boolean;
  /** warm-up sets never count toward volume, PRs, history or suggestions */
  warmup?: boolean;
  /** rate of perceived exertion, 1-10 */
  rpe?: number;
  note?: string;
  /** Absent means 'reps' (older data, and every rep-based row). */
  mode?: SetMode;
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
  /** User-created workout day names (e.g. "Upper Hypertrophy"), newest first. Alongside the fixed DAY_LABELS. */
  customDayLabels: string[];
  /** Built-in day names (from DAY_LABELS) removed from the picker. Reversible; a day already logged under one keeps its label. */
  hiddenDayLabels: string[];
  /** Your Reps-vs-Time choice per exercise, remembered for next time. Unset exercises fall back to catalog smart-detection. */
  exerciseModes: Record<string, SetMode>;
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
