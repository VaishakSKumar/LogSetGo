import type { Routine, Session } from '../types';

/**
 * Rule-based plan builder. It is deterministic and works fully offline: pick a goal, how many days a
 * week you can train, and your level, and it lays out a proven split with sensible sets and reps.
 * (It is not machine-learning; "smart" here means the rules are explicit and explainable.)
 */
export type PlanGoal = 'strength' | 'muscle' | 'endurance';
export type PlanLevel = 'beginner' | 'intermediate' | 'advanced';
export type PlanDays = 2 | 3 | 4 | 5 | 6;

export interface PlanOptions {
  goal: PlanGoal;
  days: PlanDays;
  level: PlanLevel;
}

export const PLAN_GOALS: { key: PlanGoal; label: string; blurb: string }[] = [
  { key: 'strength', label: 'Strength', blurb: 'Heavy compounds, low reps' },
  { key: 'muscle', label: 'Muscle', blurb: 'Moderate weight, 8–12 reps' },
  { key: 'endurance', label: 'Endurance', blurb: 'Lighter weight, 15 reps' },
];

export const PLAN_LEVELS: { key: PlanLevel; label: string }[] = [
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced', label: 'Advanced' },
];

/** Exercise ids are the catalog slugs. The first entries are the big compound lifts. */
const DAYS: Record<string, string[]> = {
  'Full Body A': ['barbell-back-squat', 'barbell-bench-press', 'barbell-row', 'overhead-press', 'romanian-deadlift', 'barbell-curl', 'plank'],
  'Full Body B': ['conventional-deadlift', 'incline-dumbbell-press', 'lat-pulldown', 'leg-press', 'dumbbell-lateral-raise', 'triceps-pushdown', 'cable-crunch'],
  'Full Body C': ['front-squat', 'dip', 'pull-up', 'hip-thrust', 'seated-dumbbell-shoulder-press', 'hammer-curl', 'standing-calf-raise'],
  'Upper A': ['barbell-bench-press', 'barbell-row', 'overhead-press', 'lat-pulldown', 'triceps-pushdown', 'barbell-curl', 'face-pull'],
  'Upper B': ['incline-dumbbell-press', 'pull-up', 'seated-dumbbell-shoulder-press', 'seated-cable-row', 'cable-fly', 'hammer-curl', 'dumbbell-lateral-raise'],
  'Lower A': ['barbell-back-squat', 'romanian-deadlift', 'leg-press', 'lying-leg-curl', 'standing-calf-raise', 'cable-crunch'],
  'Lower B': ['front-squat', 'hip-thrust', 'bulgarian-split-squat', 'leg-extension', 'seated-leg-curl', 'seated-calf-raise', 'hanging-leg-raise'],
  'Push A': ['barbell-bench-press', 'overhead-press', 'incline-dumbbell-press', 'dumbbell-lateral-raise', 'triceps-pushdown', 'cable-fly', 'overhead-triceps-extension'],
  'Pull A': ['barbell-row', 'pull-up', 'lat-pulldown', 'seated-cable-row', 'face-pull', 'barbell-curl', 'hammer-curl'],
  'Legs A': ['barbell-back-squat', 'romanian-deadlift', 'leg-press', 'lying-leg-curl', 'leg-extension', 'standing-calf-raise', 'hip-thrust'],
  'Push B': ['dumbbell-bench-press', 'seated-dumbbell-shoulder-press', 'incline-barbell-press', 'cable-lateral-raise', 'dip', 'skull-crusher', 'pec-deck'],
  'Pull B': ['conventional-deadlift', 'chest-supported-row', 'lat-pulldown', 'one-arm-dumbbell-row', 'rear-delt-fly', 'dumbbell-curl', 'preacher-curl'],
  'Legs B': ['front-squat', 'hip-thrust', 'bulgarian-split-squat', 'seated-leg-curl', 'leg-extension', 'seated-calf-raise', 'hanging-leg-raise'],
};

const SPLITS: Record<PlanDays, string[]> = {
  2: ['Full Body A', 'Full Body B'],
  3: ['Full Body A', 'Full Body B', 'Full Body C'],
  4: ['Upper A', 'Lower A', 'Upper B', 'Lower B'],
  5: ['Push A', 'Pull A', 'Legs A', 'Upper A', 'Lower A'],
  6: ['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B'],
};

const COMPOUNDS = 2; // the first two exercises of a day get the "main lift" scheme

/** sets × reps for main lifts and for accessories, by goal. */
const SCHEME: Record<PlanGoal, { main: [number, number]; accessory: [number, number] }> = {
  strength: { main: [5, 5], accessory: [3, 8] },
  muscle: { main: [4, 8], accessory: [3, 12] },
  endurance: { main: [3, 15], accessory: [3, 15] },
};

const COUNT: Record<PlanLevel, number> = { beginner: 4, intermediate: 5, advanced: 6 };

export function buildPlan({ goal, days, level }: PlanOptions): Routine[] {
  const scheme = SCHEME[goal];
  return SPLITS[days].map((name, d) => ({
    id: `plan-${goal}-${days}-${level}-${d}`,
    name,
    items: DAYS[name].slice(0, COUNT[level]).map((exerciseId, i) => {
      const [sets, reps] = i < COMPOUNDS ? scheme.main : scheme.accessory;
      // Beginners get one fewer set on main lifts (but never fewer than 3).
      return { exerciseId, sets: level === 'beginner' && i < COMPOUNDS ? Math.max(3, sets - 1) : sets, reps };
    }),
  }));
}

export const planSummary = (o: PlanOptions) => {
  const s = SCHEME[o.goal];
  return `${o.days} days a week · main lifts ${s.main[0]}×${s.main[1]}, accessories ${s.accessory[0]}×${s.accessory[1]}`;
};

/** Every exercise id the plan builder can use, for validating against the catalog. */
export const PLAN_EXERCISE_IDS = [...new Set(Object.values(DAYS).flat())];

/** Save what you did in a session as a reusable routine (exercise order and set counts). */
export function routineFromSession(session: Session, name: string, id: string): Routine | null {
  const items = Object.entries(session.exercises)
    .filter(([, rows]) => rows.length > 0)
    .map(([exerciseId, rows]) => ({ exerciseId, sets: rows.length }));
  return items.length ? { id, name: name.trim() || session.label, items } : null;
}
