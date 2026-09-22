import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { CATALOG, slug, splitOfGroup } from '../data/catalog';
import { dateKey } from '../lib/dates';
import { buildDemoData } from '../lib/demo';
import { normalizeDayLabel } from '../lib/daylabels';
import { buildDurationHistory, buildHistory, buildRecents, defaultLabelFor } from '../lib/progress';
import type { AppData, Exercise, Goal, HistoryEntry, MuscleGroup, Prefs, Routine, SetMode, SetPerf, SetRow, Unit } from '../types';
import { normalizeAppData } from '../lib/appdata';
import { initialData, reducer, type Field } from './reducer';

const STORAGE_KEY = 'minimalist-gym-tracker/v1';

/* ─────────────────────────── Context ─────────────────────────── */

export interface GymActions {
  selectExercise(id: string): void;
  setField(rowId: string, field: Field, value: number | null): void;
  toggleSet(rowId: string, weight: number, reps: number): void;
  addSet(): void;
  removeSet(): void;
  fillSets(values: SetPerf[]): void;
  setLabel(label: string): void;
  /** Your Reps-vs-Time choice for one exercise, remembered from now on. Today's not-yet-logged rows switch immediately. */
  setExerciseMode(exerciseId: string, mode: SetMode): void;
  /** Saves a custom workout day name and applies it to the day being logged, in one step. No-op for blank input. */
  addDayLabel(name: string): void;
  /** Removes a custom day name from the picker. Days already logged under it keep their label. */
  deleteDayLabel(label: string): void;
  /** Hides a built-in day name from the picker. Reversible — see restoreDayLabels. */
  hideDayLabel(label: string): void;
  /** Brings back every hidden built-in day name. */
  restoreDayLabels(): void;
  setUnit(unit: Unit): void;
  /** Which calendar date the workout screen is logging. `null` follows the real today. */
  setWorkDate(date: string | null): void;
  /** Replaces everything (used by backup import). */
  replaceAll(data: AppData): void;
  addRoutine(routine: Routine): void;
  deleteRoutine(id: string): void;
  /** Loads a routine into the day being logged: rows for every exercise, first one selected. */
  startRoutine(routine: Routine): void;
  setGoal(exerciseId: string, goal: Goal | null): void;
  setPrefs(prefs: Partial<Prefs>): void;
  /** Warm-up flag, RPE and note for a set of the selected exercise. */
  setSetMeta(rowId: string, meta: { warmup?: boolean; rpe?: number | null; note?: string }): void;
  setExerciseNote(exerciseId: string, note: string): void;
  /** Deletes every set of one exercise from the day being logged. */
  removeExercise(exerciseId: string): void;
  /** Clears the selected exercise, so the entry panel starts from an empty search. */
  deselectExercise(): void;
  /** Creates (or finds) a custom exercise by name and returns it. */
  createExercise(name: string, group?: MuscleGroup): Exercise;
}

interface GymContextValue {
  ready: boolean;
  data: AppData;
  /** The date being logged: whatever the calendar routed to, else the real today. */
  today: string;
  /** The actual calendar date right now. */
  realToday: string;
  /** Bumps whenever the user picks an exercise or starts a routine, so the screen can open its entry panel. */
  selectionCount: number;
  exercises: Exercise[];
  byId: Map<string, Exercise>;
  /** Rep-based history: e1RM, PRs, suggestions, records and goals all read from this. */
  history: Record<string, HistoryEntry[]>;
  /** Time-based history (duration-in-seconds as `reps`), for "last time" ghosts and hold PRs. */
  durationHistory: Record<string, HistoryEntry[]>;
  recents: ReturnType<typeof buildRecents>;
  label: string;
  active: Exercise | null;
  rows: SetRow[];
  actions: GymActions;
}

const GymContext = createContext<GymContextValue | null>(null);

export function useGym() {
  const ctx = useContext(GymContext);
  if (!ctx) throw new Error('useGym must be used inside <GymProvider>');
  return ctx;
}

function parseStored(raw: string | null): AppData | null {
  if (!raw) return null;
  try {
    return normalizeAppData(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function GymProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, initialData);
  const [ready, setReady] = useState(false);
  const [realToday, setRealToday] = useState(() => dateKey());
  const [workDate, setWorkDateState] = useState<string | null>(null);
  const [selectionCount, setSelectionCount] = useState(0);
  const today = workDate ?? realToday;

  const dataRef = useRef(data);
  dataRef.current = data;
  const todayRef = useRef(today);
  todayRef.current = today;

  // Load once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let stored: AppData | null = null;
      try {
        stored = parseStored(await AsyncStorage.getItem(STORAGE_KEY));
      } catch {
        stored = null;
      }
      if (!stored && process.env.EXPO_PUBLIC_DEMO === '1') stored = buildDemoData(dateKey());
      if (cancelled) return;
      if (stored) dispatch({ type: 'hydrate', data: stored });
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced save, flushed when the app backgrounds.
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {}), 300);
    return () => clearTimeout(t);
  }, [data, ready]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setRealToday(dateKey());
      else AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dataRef.current)).catch(() => {});
    });
    const tick = setInterval(() => setRealToday(dateKey()), 60_000);
    return () => {
      sub.remove();
      clearInterval(tick);
    };
  }, []);

  const exercises = useMemo(() => [...data.customExercises, ...CATALOG], [data.customExercises]);
  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const history = useMemo(() => buildHistory(data.sessions), [data.sessions]);
  const durationHistory = useMemo(() => buildDurationHistory(data.sessions), [data.sessions]);
  const recents = useMemo(() => buildRecents(data.sessions), [data.sessions]);

  const active = (data.activeExerciseId && byId.get(data.activeExerciseId)) || null;
  const rows = (active && data.sessions[today]?.exercises[active.id]) || EMPTY_ROWS;
  const label = data.sessions[today]?.label ?? defaultLabelFor(today);

  /** Your saved preference for this exercise, else the catalog's smart-detected default, else reps. */
  const resolveMode = (id: string): SetMode => {
    const d = dataRef.current;
    return d.exerciseModes[id] ?? d.customExercises.find((e) => e.id === id)?.defaultMode ?? CATALOG.find((e) => e.id === id)?.defaultMode ?? 'reps';
  };

  // A new day keeps your exercise selected, with fresh rows.
  useEffect(() => {
    if (ready && active && rows.length === 0) dispatch({ type: 'select', id: active.id, date: today, mode: resolveMode(active.id) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, active, rows.length, today]);

  const actions = useMemo<GymActions>(
    () => ({
      selectExercise: (id) => {
        setSelectionCount((n) => n + 1);
        dispatch({ type: 'select', id, date: todayRef.current, mode: resolveMode(id) });
      },
      setField: (rowId, field, value) =>
        dispatch({ type: 'setField', date: todayRef.current, rowId, field, value }),
      toggleSet: (rowId, weight, reps) =>
        dispatch({ type: 'toggle', date: todayRef.current, rowId, weight, reps, at: Date.now() }),
      addSet: () => dispatch({ type: 'addSet', date: todayRef.current }),
      removeSet: () => dispatch({ type: 'removeSet', date: todayRef.current }),
      fillSets: (values) => dispatch({ type: 'fill', date: todayRef.current, values }),
      setLabel: (label) => dispatch({ type: 'label', date: todayRef.current, label }),
      setExerciseMode: (exerciseId, mode) => dispatch({ type: 'setExerciseMode', date: todayRef.current, exerciseId, mode }),
      addDayLabel: (name) => {
        const label = normalizeDayLabel(name);
        if (!label) return;
        dispatch({ type: 'addDayLabel', label });
        dispatch({ type: 'label', date: todayRef.current, label });
      },
      deleteDayLabel: (label) => dispatch({ type: 'deleteDayLabel', label }),
      hideDayLabel: (label) => dispatch({ type: 'hideDayLabel', label }),
      restoreDayLabels: () => dispatch({ type: 'restoreDayLabels' }),
      setUnit: (unit) => dispatch({ type: 'unit', unit }),
      setWorkDate: (date) => setWorkDateState(date),
      replaceAll: (data) => dispatch({ type: 'hydrate', data }),
      addRoutine: (routine) => dispatch({ type: 'addRoutine', routine }),
      deleteRoutine: (id) => dispatch({ type: 'deleteRoutine', id }),
      startRoutine: (routine) => {
        setSelectionCount((n) => n + 1);
        const modes = Object.fromEntries(routine.items.map((it) => [it.exerciseId, resolveMode(it.exerciseId)]));
        dispatch({ type: 'startRoutine', date: todayRef.current, routine, modes });
      },
      setGoal: (exerciseId, goal) => dispatch({ type: 'setGoal', exerciseId, goal }),
      setPrefs: (prefs) => dispatch({ type: 'setPrefs', prefs }),
      setSetMeta: (rowId, meta) => dispatch({ type: 'setSetMeta', date: todayRef.current, rowId, meta }),
      setExerciseNote: (exerciseId, note) => dispatch({ type: 'setExerciseNote', date: todayRef.current, exerciseId, note }),
      removeExercise: (exerciseId) => dispatch({ type: 'removeExercise', date: todayRef.current, exerciseId }),
      deselectExercise: () => dispatch({ type: 'deselect' }),
      createExercise: (name, group = 'Other') => {
        const id = slug(name);
        const existing = dataRef.current;
        const found =
          existing.customExercises.find((e) => e.id === id) ?? CATALOG.find((e) => e.id === id);
        if (found) return found;
        const exercise: Exercise = { id, name, group, split: splitOfGroup(group), custom: true };
        dispatch({ type: 'createExercise', exercise });
        return exercise;
      },
    }),
    [],
  );

  const value = useMemo<GymContextValue>(
    () => ({ ready, data, today, realToday, selectionCount, exercises, byId, history, durationHistory, recents, label, active, rows, actions }),
    [ready, data, today, realToday, selectionCount, exercises, byId, history, durationHistory, recents, label, active, rows, actions],
  );

  return <GymContext.Provider value={value}>{children}</GymContext.Provider>;
}

const EMPTY_ROWS: SetRow[] = [];
