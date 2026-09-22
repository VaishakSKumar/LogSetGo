import { DEFAULT_PREFS, type AppData, type Exercise, type Goal, type Routine, type SetMode, type Session } from '../types';
import { MAX_CUSTOM_DAY_LABELS } from './daylabels';
import { DAY_LABELS } from './progress';

export const EMPTY_APP_DATA: AppData = {
  version: 1,
  unit: 'kg',
  activeExerciseId: null,
  customExercises: [],
  sessions: {},
  routines: [],
  goals: {},
  prefs: DEFAULT_PREFS,
  customDayLabels: [],
  hiddenDayLabels: [],
  exerciseModes: {},
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

/** Trimmed, non-empty strings, deduped case-insensitively (first occurrence wins), capped. */
function cleanDayLabels(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const label = item.trim();
    if (!label || out.length >= MAX_CUSTOM_DAY_LABELS) continue;
    if (out.some((l) => l.toLowerCase() === label.toLowerCase())) continue;
    out.push(label);
  }
  return out;
}

/** Only real built-in names, deduped, in DAY_LABELS order (so it never grows past DAY_LABELS.length). */
function cleanHiddenDayLabels(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const set = new Set(raw.filter((v): v is string => typeof v === 'string').map((v) => v.trim().toLowerCase()));
  return DAY_LABELS.filter((d) => set.has(d.toLowerCase()));
}

/** Drops anything that isn't a real exercise-id → 'reps'|'time' pair. */
function cleanExerciseModes(raw: unknown): Record<string, SetMode> {
  if (!isObj(raw)) return {};
  const out: Record<string, SetMode> = {};
  for (const [id, mode] of Object.entries(raw)) if (mode === 'reps' || mode === 'time') out[id] = mode;
  return out;
}

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
    customDayLabels: cleanDayLabels(p.customDayLabels),
    hiddenDayLabels: cleanHiddenDayLabels(p.hiddenDayLabels),
    exerciseModes: cleanExerciseModes(p.exerciseModes),
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
  const customDayLabels = [...current.customDayLabels];
  for (const label of incoming.customDayLabels) {
    if (customDayLabels.length >= MAX_CUSTOM_DAY_LABELS) break;
    if (!customDayLabels.some((l) => l.toLowerCase() === label.toLowerCase())) customDayLabels.push(label);
  }
  // Hidden defaults union: hidden on either device stays hidden after merging.
  const hiddenSet = new Set([...current.hiddenDayLabels, ...incoming.hiddenDayLabels].map((l) => l.toLowerCase()));
  const hiddenDayLabels = DAY_LABELS.filter((d) => hiddenSet.has(d.toLowerCase()));
  return {
    ...current,
    sessions,
    customExercises: byId(current.customExercises, incoming.customExercises),
    routines: byId(current.routines, incoming.routines),
    goals: { ...incoming.goals, ...current.goals },
    customDayLabels,
    hiddenDayLabels,
    // Same rule as goals: yours wins where you've both set one, theirs fills in what you haven't.
    exerciseModes: { ...incoming.exerciseModes, ...current.exerciseModes },
  };
}
