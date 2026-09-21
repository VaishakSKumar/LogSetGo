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
}

export interface Session {
  label: string;
  exercises: Record<string, SetRow[]>;
}

export interface AppData {
  version: 1;
  unit: Unit;
  activeExerciseId: string | null;
  customExercises: Exercise[];
  /** keyed by local date, YYYY-MM-DD */
  sessions: Record<string, Session>;
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
