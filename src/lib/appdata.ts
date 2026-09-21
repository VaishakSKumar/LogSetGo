import { DEFAULT_PREFS, type AppData, type Exercise, type Goal, type Routine, type Session } from '../types';

export const EMPTY_APP_DATA: AppData = {
  version: 1,
  unit: 'kg',
  activeExerciseId: null,
  customExercises: [],
  sessions: {},
  routines: [],
  goals: {},
  prefs: DEFAULT_PREFS,
};

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const posNum = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback);

const validRoutine = (r: unknown): r is Routine =>
  isObj(r) &&
  typeof r.id === 'string' &&
  typeof r.name === 'string' &&
  Array.isArray(r.items) &&
  r.items.every((i) => isObj(i) && typeof i.exerciseId === 'string' && typeof i.sets === 'number');

const validExercise = (e: unknown): e is Exercise => isObj(e) && typeof e.id === 'string' && typeof e.name === 'string';

/**
 * Turns anything that looks like saved data into a complete, safe AppData, filling in
 * fields added in later versions. Returns null if it isn't LogSetGo data at all.
 * Used for app storage and for backup import, so both agree on what "valid" means.
 */
export function normalizeAppData(input: unknown): AppData | null {
  if (!isObj(input) || input.version !== 1 || !isObj(input.sessions)) return null;
  const p = input as Partial<AppData> & Record<string, unknown>;
  const rawPrefs = input.prefs;
  const prefs: Record<string, unknown> = isObj(rawPrefs) ? rawPrefs : {};
  return {
    version: 1,
    unit: p.unit === 'lb' ? 'lb' : 'kg',
    activeExerciseId: typeof p.activeExerciseId === 'string' ? p.activeExerciseId : null,
    customExercises: Array.isArray(p.customExercises) ? p.customExercises.filter(validExercise) : [],
    sessions: p.sessions as Record<string, Session>,
    routines: Array.isArray(p.routines) ? p.routines.filter(validRoutine) : [],
    goals: isObj(p.goals)
      ? (Object.fromEntries(
          Object.entries(p.goals).filter(([, g]) => isObj(g) && typeof g.targetKg === 'number' && g.targetKg > 0),
        ) as Record<string, Goal>)
      : {},
    prefs: { stepKg: posNum(prefs.stepKg, DEFAULT_PREFS.stepKg), stepLb: posNum(prefs.stepLb, DEFAULT_PREFS.stepLb) },
  };
}

/**
 * Merge `incoming` into `current` without ever overwriting what's already there:
 * dates and records you already have win; anything you don't have is added.
 */
export function mergeAppData(current: AppData, incoming: AppData): AppData {
  const sessions = { ...incoming.sessions, ...current.sessions };
  // For a date present in both, keep yours but add exercises you never logged that day.
  for (const [date, theirs] of Object.entries(incoming.sessions)) {
    const mine = current.sessions[date];
    if (!mine) continue;
    sessions[date] = { ...mine, exercises: { ...theirs.exercises, ...mine.exercises }, notes: { ...theirs.notes, ...mine.notes } };
  }
  const byId = <T extends { id: string }>(a: T[], b: T[]) => [...a, ...b.filter((x) => !a.some((y) => y.id === x.id))];
  return {
    ...current,
    sessions,
    customExercises: byId(current.customExercises, incoming.customExercises),
    routines: byId(current.routines, incoming.routines),
    goals: { ...incoming.goals, ...current.goals },
  };
}
