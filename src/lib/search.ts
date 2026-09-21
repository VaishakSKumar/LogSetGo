import type { Exercise } from '../types';

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Score tiers: 100 name prefix · 80 every token starts a word · 60 alias hit · 50 substring.
 * `recency` (0 = most recent) nudges ties toward what you actually train.
 */
export function scoreExercise(ex: Exercise, query: string, recency?: number): number {
  const q = norm(query);
  if (!q) return 0;
  const name = norm(ex.name);
  const tokens = q.split(' ');

  const startsAWord = (text: string) => {
    const w = text.split(' ');
    return tokens.every((t) => w.some((x) => x.startsWith(t)));
  };

  // Loose substring matching is only trustworthy once there's enough typed to mean something.
  let base = 0;
  if (name.startsWith(q)) base = 100;
  else if (startsAWord(name)) base = 80;
  else if (ex.aliases?.some((a) => norm(a).startsWith(q) || startsAWord(norm(a)))) base = 60;
  else if (q.length >= 3 && name.includes(q)) base = 50;
  if (base === 0) return 0;

  const bonus = recency === undefined ? 0 : Math.max(0, 10 - recency);
  return base + bonus;
}

export function searchExercises(
  query: string,
  all: Exercise[],
  recencyRank: Map<string, number>,
  limit = 8,
): Exercise[] {
  return all
    .map((ex) => ({ ex, score: scoreExercise(ex, query, recencyRank.get(ex.id)) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.ex.name.localeCompare(b.ex.name))
    .slice(0, limit)
    .map((r) => r.ex);
}

/** Ghost completion: only when the best hit literally continues what was typed. */
export function ghostSuffix(query: string, top: Exercise | undefined): string {
  if (!top || !query.trim()) return '';
  return top.name.toLowerCase().startsWith(query.toLowerCase()) ? top.name.slice(query.length) : '';
}

export const hasExactName = (query: string, all: Exercise[]) =>
  all.some((e) => norm(e.name) === norm(query));

/** Offer "Add “…”" only when the query isn't already heading toward an existing exercise. */
export function shouldOfferCreate(query: string, all: Exercise[], results: Exercise[]): boolean {
  const q = norm(query);
  if (q.length < 3 || hasExactName(query, all)) return false;
  return !results.some((e) => norm(e.name).startsWith(q));
}

export const tidyName = (raw: string) =>
  raw
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
