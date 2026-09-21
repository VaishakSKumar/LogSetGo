import {
  bestE1rmExcluding,
  buildHistory,
  defaultLabelFor,
  e1rm,
  previousEntry,
} from '../lib/progress';
import { EMPTY_APP_DATA } from '../lib/appdata';
import { type AppData, type Exercise, type Goal, type Prefs, type Routine, type SetPerf, type SetRow, type Session, type Unit } from '../types';

export type Field = 'weight' | 'reps';

export type Action =
  | { type: 'hydrate'; data: AppData }
  | { type: 'select'; id: string; date: string }
  | { type: 'setField'; date: string; rowId: string; field: Field; value: number | null }
  | { type: 'toggle'; date: string; rowId: string; weight: number; reps: number; at: number }
  | { type: 'addSet'; date: string }
  | { type: 'removeSet'; date: string }
  | { type: 'fill'; date: string; values: SetPerf[] }
  | { type: 'label'; date: string; label: string }
  | { type: 'unit'; unit: Unit }
  | { type: 'createExercise'; exercise: Exercise }
  | { type: 'addRoutine'; routine: Routine }
  | { type: 'deleteRoutine'; id: string }
  | { type: 'startRoutine'; date: string; routine: Routine }
  | { type: 'setGoal'; exerciseId: string; goal: Goal | null }
  | { type: 'setPrefs'; prefs: Partial<Prefs> }
  | { type: 'setSetMeta'; date: string; rowId: string; meta: { warmup?: boolean; rpe?: number | null; note?: string } }
  | { type: 'setExerciseNote'; date: string; exerciseId: string; note: string }
  | { type: 'removeExercise'; date: string; exerciseId: string }
  | { type: 'deselect' };

export const initialData: AppData = EMPTY_APP_DATA;

const newRow = (rows: SetRow[]): SetRow => ({
  id: String(rows.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1),
  weight: null,
  reps: null,
  done: false,
});

function withSession(state: AppData, date: string): Session {
  return state.sessions[date] ?? { label: defaultLabelFor(date), exercises: {} };
}

/** Immutable update of the active exercise's rows for `date`. */
function updateRows(state: AppData, date: string, fn: (rows: SetRow[]) => SetRow[]): AppData {
  const id = state.activeExerciseId;
  if (!id) return state;
  const session = withSession(state, date);
  const rows = fn(session.exercises[id] ?? []);
  return {
    ...state,
    sessions: { ...state.sessions, [date]: { ...session, exercises: { ...session.exercises, [id]: rows } } },
  };
}

export function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'hydrate':
      return action.data;

    case 'select': {
      const next = { ...state, activeExerciseId: action.id };
      const existing = withSession(state, action.date).exercises[action.id];
      if (existing?.length) return next;
      // Start with as many empty rows as you did last time (min 3), ghosted from history.
      const last = previousEntry(buildHistory(state.sessions)[action.id], action.date);
      const count = Math.max(last?.sets.length ?? 3, 1);
      return updateRows(next, action.date, () => {
        const rows: SetRow[] = [];
        for (let i = 0; i < count; i++) rows.push(newRow(rows));
        return rows;
      });
    }

    case 'setField':
      return updateRows(state, action.date, (rows) =>
        rows.map((r) => (r.id === action.rowId && !r.done ? { ...r, [action.field]: action.value } : r)),
      );

    case 'toggle': {
      const id = state.activeExerciseId;
      if (!id) return state;
      const prior = bestE1rmExcluding(state.sessions, id, action.rowId, action.date);
      return updateRows(state, action.date, (rows) =>
        rows.map((r) => {
          if (r.id !== action.rowId) return r;
          if (r.done) return { ...r, done: false, at: undefined, pr: undefined };
          const pr = !r.warmup && prior !== null && e1rm(action.weight, action.reps) > prior + 1e-6;
          return { ...r, weight: action.weight, reps: action.reps, done: true, at: action.at, pr };
        }),
      );
    }

    case 'addSet':
      return updateRows(state, action.date, (rows) => {
        const last = rows[rows.length - 1];
        // A new set starts from the set before it (weight and reps), so repeating it is one tap.
        return [...rows, last ? { ...newRow(rows), weight: last.weight, reps: last.reps } : newRow(rows)];
      });

    case 'removeSet':
      return updateRows(state, action.date, (rows) =>
        rows.length > 1 && !rows[rows.length - 1].done ? rows.slice(0, -1) : rows,
      );

    case 'fill':
      return updateRows(state, action.date, (rows) => {
        const out = [...rows];
        while (out.length < action.values.length) out.push(newRow(out));
        return out.map((r, i) => (r.done || !action.values[i] ? r : { ...r, ...action.values[i] }));
      });

    case 'label': {
      const session = withSession(state, action.date);
      return { ...state, sessions: { ...state.sessions, [action.date]: { ...session, label: action.label } } };
    }

    case 'unit':
      return { ...state, unit: action.unit };

    case 'addRoutine':
      return { ...state, routines: [...state.routines.filter((r) => r.id !== action.routine.id), action.routine] };

    case 'deleteRoutine':
      return { ...state, routines: state.routines.filter((r) => r.id !== action.id) };

    case 'startRoutine': {
      const session = withSession(state, action.date);
      const exercises = { ...session.exercises };
      for (const item of action.routine.items) {
        if (exercises[item.exerciseId]?.length) continue;
        const rows: SetRow[] = [];
        for (let i = 0; i < Math.max(1, item.sets); i++) rows.push(newRow(rows));
        exercises[item.exerciseId] = rows;
      }
      return {
        ...state,
        activeExerciseId: action.routine.items[0]?.exerciseId ?? state.activeExerciseId,
        sessions: { ...state.sessions, [action.date]: { ...session, label: action.routine.name, exercises } },
      };
    }

    case 'setGoal': {
      const goals = { ...state.goals };
      if (action.goal) goals[action.exerciseId] = action.goal;
      else delete goals[action.exerciseId];
      return { ...state, goals };
    }

    case 'setPrefs':
      return { ...state, prefs: { ...state.prefs, ...action.prefs } };

    case 'setSetMeta':
      return updateRows(state, action.date, (rows) =>
        rows.map((r) => {
          if (r.id !== action.rowId) return r;
          const next = { ...r };
          if (action.meta.warmup !== undefined) {
            next.warmup = action.meta.warmup || undefined;
            if (action.meta.warmup) next.pr = undefined;
          }
          if (action.meta.rpe !== undefined) next.rpe = action.meta.rpe ?? undefined;
          if (action.meta.note !== undefined) next.note = action.meta.note.trim() || undefined;
          return next;
        }),
      );

    case 'setExerciseNote': {
      const session = withSession(state, action.date);
      const notes = { ...session.notes };
      if (action.note.trim()) notes[action.exerciseId] = action.note;
      else delete notes[action.exerciseId];
      return { ...state, sessions: { ...state.sessions, [action.date]: { ...session, notes } } };
    }

    case 'deselect':
      return state.activeExerciseId ? { ...state, activeExerciseId: null } : state;

    case 'removeExercise': {
      const session = state.sessions[action.date];
      if (!session?.exercises[action.exerciseId]) return state;
      const { [action.exerciseId]: _gone, ...exercises } = session.exercises;
      const notes = session.notes ? { ...session.notes } : undefined;
      if (notes) delete notes[action.exerciseId];
      return {
        ...state,
        // Leaving it selected would make the store re-create empty rows for it.
        activeExerciseId: state.activeExerciseId === action.exerciseId ? null : state.activeExerciseId,
        sessions: { ...state.sessions, [action.date]: { ...session, exercises, ...(notes ? { notes } : {}) } },
      };
    }

    case 'createExercise':
      return state.customExercises.some((e) => e.id === action.exercise.id)
        ? state
        : { ...state, customExercises: [...state.customExercises, action.exercise] };
  }
}
