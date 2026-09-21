import type { AppData, SetRow, Session } from '../types';
import type { BodyData, WeightEntry } from './body';
import { addDays, daysBetween, parseKey, weekStartKey, weekdayIndex } from './dates';

/**
 * Five weeks of plausible push / pull / legs history so every screen has something to show.
 * Only used when the app is started with EXPO_PUBLIC_DEMO=1 and nothing is stored yet.
 */
type Lift = [exerciseId: string, baseKg: number];

const PLAN: Record<number, { label: string; lifts: Lift[] }> = {
  0: {
    label: 'Push A',
    lifts: [
      ['barbell-bench-press', 60],
      ['incline-dumbbell-press', 22],
      ['overhead-press', 37.5],
      ['triceps-pushdown', 27.5],
    ],
  },
  2: {
    label: 'Pull A',
    lifts: [
      ['lat-pulldown', 55],
      ['seated-cable-row', 50],
      ['barbell-curl', 30],
    ],
  },
  4: {
    label: 'Legs A',
    lifts: [
      ['barbell-back-squat', 80],
      ['romanian-deadlift', 70],
      ['leg-extension', 45],
    ],
  },
};

export function buildDemoData(todayKey: string): AppData {
  const sessions: Record<string, Session> = {};
  const thisWeek = weekStartKey(todayKey);

  for (let back = weekdayIndex(todayKey) + 35; back >= 1; back--) {
    const date = addDays(todayKey, -back);
    const plan = PLAN[weekdayIndex(date)];
    if (!plan) continue;

    const before = daysBetween(date, thisWeek); // > 0 when the date precedes this week
    const weeksAgo = before <= 0 ? 0 : Math.ceil(before / 7); // 0 = this week, 5 = oldest
    const stage = 5 - weeksAgo; // rises over time
    const noon = parseKey(date).getTime();
    const exercises: Record<string, SetRow[]> = {};

    plan.lifts.forEach(([id, base], li) => {
      const weight = base + Math.floor(stage / 2) * 2.5;
      const reps = stage % 2 === 0 ? [8, 8, 7] : [8, 8, 8];
      exercises[id] = reps.map((r, si) => ({
        id: String(si + 1),
        weight,
        reps: r,
        done: true,
        at: noon + (li * 3 + si) * 240_000,
      }));
    });
    sessions[date] = { label: plan.label, exercises };
  }

  return { version: 1, unit: 'kg', activeExerciseId: null, customExercises: [], sessions };
}

/**
 * Attendance marks to go with the demo workouts: training days are derived as Present,
 * so this only marks the gaps — mostly rest-day Holidays, with an occasional Absent.
 */
export function buildDemoAttendance(todayKey: string, sessions: Record<string, Session>): Record<string, 'holiday' | 'absent'> {
  const marks: Record<string, 'holiday' | 'absent'> = {};
  for (let back = 1; back <= 40; back++) {
    const date = addDays(todayKey, -back);
    if (sessions[date]) continue;
    marks[date] = back % 9 === 4 ? 'absent' : 'holiday';
  }
  return marks;
}

/** Six weeks of body-weight entries trending gently down, at 178 cm. */
export function buildDemoBody(todayKey: string): BodyData {
  const kgs = [79.4, 79.0, 79.3, 78.6, 78.2, 78.4, 77.7, 77.3, 77.0];
  const entries: WeightEntry[] = kgs.map((kg, i) => {
    const date = addDays(todayKey, -(kgs.length - 1 - i) * 5 - 3);
    return { id: `demo${i}`, date, at: parseKey(date).getTime() - 4 * 3_600_000 + i * 60_000, kg };
  });
  return { heightCm: 178, heightUnit: 'cm', entries };
}
