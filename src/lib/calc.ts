import type { Unit } from '../types';

/* All calculators work in the display unit you pass in, so kg and lb use the same code. */

const round = (n: number, step: number) => Math.round(n / step) * step;
const clean = (n: number) => Math.round(n * 100) / 100;

export interface OneRepMax {
  epley: number;
  /** undefined at 37+ reps, where the formula breaks down */
  brzycki: number | undefined;
  /** the number to use: average of both up to 10 reps, Epley beyond */
  estimate: number;
}

/** Estimated one-rep max from any set. Accurate at low reps; treat 12+ reps as a rough guide. */
export function oneRepMax(weight: number, reps: number): OneRepMax {
  const r = Math.max(1, Math.round(reps));
  const epley = r === 1 ? weight : weight * (1 + r / 30);
  const brzycki = r === 1 ? weight : r < 37 ? (weight * 36) / (37 - r) : undefined;
  const estimate = brzycki !== undefined && r <= 10 ? (epley + brzycki) / 2 : epley;
  return { epley: clean(epley), brzycki: brzycki === undefined ? undefined : clean(brzycki), estimate: clean(estimate) };
}

/** Typical reps you can do at each percentage of your max. */
export const PERCENT_ROWS: { pct: number; reps: number }[] = [
  { pct: 100, reps: 1 },
  { pct: 95, reps: 2 },
  { pct: 90, reps: 4 },
  { pct: 85, reps: 6 },
  { pct: 80, reps: 8 },
  { pct: 75, reps: 10 },
  { pct: 70, reps: 12 },
  { pct: 65, reps: 15 },
  { pct: 60, reps: 20 },
];

export const percentTable = (oneRm: number, step = 0.5) =>
  PERCENT_ROWS.map((r) => ({ ...r, weight: clean(round(oneRm * (r.pct / 100), step)) }));

/* ─── Plates ─── */

export const PLATES: Record<Unit, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
};
export const DEFAULT_BAR: Record<Unit, number> = { kg: 20, lb: 45 };

export interface PlateLoad {
  perSide: { plate: number; count: number }[];
  loaded: number;
  /** how far the closest loadable weight is below the target (0 = exact) */
  short: number;
  /** true when the target is below the empty bar */
  belowBar: boolean;
}

/** Plates to load on each side of the bar (greedy, heaviest first). */
export function platesPerSide(target: number, bar: number, plates: number[] = []): PlateLoad {
  const available = [...plates].sort((a, b) => b - a);
  if (target < bar) return { perSide: [], loaded: bar, short: 0, belowBar: true };
  let left = (target - bar) / 2;
  const perSide: { plate: number; count: number }[] = [];
  for (const plate of available) {
    const count = Math.floor(left / plate + 1e-9);
    if (count > 0) {
      perSide.push({ plate, count });
      left = clean(left - count * plate);
    }
  }
  const loaded = clean(bar + 2 * perSide.reduce((s, p) => s + p.plate * p.count, 0));
  return { perSide, loaded, short: clean(target - loaded), belowBar: false };
}

/* ─── Warm-ups ─── */

export interface WarmupSet {
  weight: number;
  reps: number;
  label: string;
}

/**
 * A ramp to your first working set: the empty bar, then ~40 / 60 / 75 / 90%, with reps dropping as
 * the weight climbs. Weights are rounded to your smallest jump and never reach the working weight.
 */
export function warmupSets(working: number, bar: number, step: number): WarmupSet[] {
  if (working <= bar) return [];
  const ramp: [number, number, string][] = [
    [0.4, 5, '40%'],
    [0.6, 3, '60%'],
    [0.75, 2, '75%'],
    [0.9, 1, '90%'],
  ];
  const out: WarmupSet[] = [];
  if (working >= bar * 1.5) out.push({ weight: bar, reps: 10, label: 'Empty bar' });
  for (const [p, reps, label] of ramp) {
    const w = clean(Math.max(bar, round(working * p, step)));
    if (w < working && !out.some((s) => s.weight === w)) out.push({ weight: w, reps, label });
  }
  return out;
}
