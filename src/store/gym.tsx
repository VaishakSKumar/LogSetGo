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

import { CATALOG, slug } from '../data/catalog';
import { dateKey } from '../lib/dates';
import { buildDemoData } from '../lib/demo';
import { buildHistory, buildRecents, defaultLabelFor } from '../lib/progress';
import type { AppData, Exercise, HistoryEntry, SetPerf, SetRow, Unit } from '../types';
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
  setUnit(unit: Unit): void;
  /** Which calendar date the workout screen is logging. `null` follows the real today. */
  setWorkDate(date: string | null): void;
  /** Creates (or finds) a custom exercise by name and returns it. */
  createExercise(name: string): Exercise;
}

interface GymContextValue {
  ready: boolean;
  data: AppData;
  /** The date being logged: whatever the calendar routed to, else the real today. */
  today: string;
  /** The actual calendar date right now. */
  realToday: string;
  exercises: Exercise[];
  byId: Map<string, Exercise>;
  history: Record<string, HistoryEntry[]>;
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
    const parsed = JSON.parse(raw) as Partial<AppData>;
    if (parsed.version !== 1 || typeof parsed.sessions !== 'object' || !parsed.sessions) return null;
    return { ...initialData, ...parsed } as AppData;
  } catch {
    return null;
  }
}

export function GymProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, initialData);
  const [ready, setReady] = useState(false);
  const [realToday, setRealToday] = useState(() => dateKey());
  const [workDate, setWorkDateState] = useState<string | null>(null);
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
  const recents = useMemo(() => buildRecents(data.sessions), [data.sessions]);

  const active = (data.activeExerciseId && byId.get(data.activeExerciseId)) || null;
  const rows = (active && data.sessions[today]?.exercises[active.id]) || EMPTY_ROWS;
  const label = data.sessions[today]?.label ?? defaultLabelFor(today);

  // A new day keeps your exercise selected, with fresh rows.
  useEffect(() => {
    if (ready && active && rows.length === 0) dispatch({ type: 'select', id: active.id, date: today });
  }, [ready, active, rows.length, today]);

  const actions = useMemo<GymActions>(
    () => ({
      selectExercise: (id) => dispatch({ type: 'select', id, date: todayRef.current }),
      setField: (rowId, field, value) =>
        dispatch({ type: 'setField', date: todayRef.current, rowId, field, value }),
      toggleSet: (rowId, weight, reps) =>
        dispatch({ type: 'toggle', date: todayRef.current, rowId, weight, reps, at: Date.now() }),
      addSet: () => dispatch({ type: 'addSet', date: todayRef.current }),
      removeSet: () => dispatch({ type: 'removeSet', date: todayRef.current }),
      fillSets: (values) => dispatch({ type: 'fill', date: todayRef.current, values }),
      setLabel: (label) => dispatch({ type: 'label', date: todayRef.current, label }),
      setUnit: (unit) => dispatch({ type: 'unit', unit }),
      setWorkDate: (date) => setWorkDateState(date),
      createExercise: (name) => {
        const id = slug(name);
        const existing = dataRef.current;
        const found =
          existing.customExercises.find((e) => e.id === id) ?? CATALOG.find((e) => e.id === id);
        if (found) return found;
        const exercise: Exercise = { id, name, group: 'Other', split: 'other', custom: true };
        dispatch({ type: 'createExercise', exercise });
        return exercise;
      },
    }),
    [],
  );

  const value = useMemo<GymContextValue>(
    () => ({ ready, data, today, realToday, exercises, byId, history, recents, label, active, rows, actions }),
    [ready, data, today, realToday, exercises, byId, history, recents, label, active, rows, actions],
  );

  return <GymContext.Provider value={value}>{children}</GymContext.Provider>;
}

const EMPTY_ROWS: SetRow[] = [];
