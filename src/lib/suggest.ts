import type { Exercise } from '../types';
import { splitsOfLabel, type RecentExercise } from './progress';

export interface Browse {
  /** what you've actually trained, today's split first, then most recent */
  recent: Exercise[];
  /** filler for new users / thin history: staples for today's split */
  suggested: Exercise[];
}

const TARGET = 6;

/** The list shown the instant the search box is tapped, before anything is typed. */
export function browseExercises(exercises: Exercise[], recents: RecentExercise[], dayLabel: string): Browse {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const splits = splitsOfLabel(dayLabel);

  const seen = recents.map((r) => byId.get(r.id)).filter((e): e is Exercise => !!e);
  // Array.prototype.sort is stable: split-matches float up, recency order is otherwise kept.
  const recent = [...seen]
    .sort((a, b) => Number(splits.includes(b.split)) - Number(splits.includes(a.split)))
    .slice(0, TARGET);

  const taken = new Set(recent.map((e) => e.id));
  const suggested = exercises
    .filter((e) => !e.custom && splits.includes(e.split) && !taken.has(e.id))
    .slice(0, Math.max(0, TARGET - recent.length));

  return { recent, suggested };
}
