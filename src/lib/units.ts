import type { Unit } from '../types';

const LB_PER_KG = 2.2046226218;

export const toDisplay = (kg: number, unit: Unit) => (unit === 'kg' ? kg : kg * LB_PER_KG);
export const fromDisplay = (value: number, unit: Unit) => (unit === 'kg' ? value : value / LB_PER_KG);

/** Smallest plate jump, in display units. */
export const stepFor = (unit: Unit) => (unit === 'kg' ? 2.5 : 5);

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Rounds a weight for display and for committing typed values. One decimal is enough for almost
 * everything, but quarter steps (101.25, from a 1.25 kg plate) must stay exact or the app would
 * silently log 101.3 instead of what was lifted.
 */
export function roundDisplay(v: number): number {
  const quarter = Math.round(v * 4) / 4;
  return Math.abs(v - quarter) < 0.006 ? Math.round(quarter * 100) / 100 : round1(v);
}

/** "82.5", "80", "101.25" — no trailing zeros. */
export function fmtWeight(kg: number, unit: Unit): string {
  return String(roundDisplay(toDisplay(kg, unit)));
}

export function fmtWeightUnit(kg: number, unit: Unit): string {
  return `${fmtWeight(kg, unit)} ${unit}`;
}

/** "12,450" */
export function fmtVolume(kg: number, unit: Unit): string {
  return String(Math.round(toDisplay(kg, unit))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Signed weight delta: "+2.5", "−5" */
export function fmtDelta(deltaKg: number, unit: Unit): string {
  const v = roundDisplay(toDisplay(deltaKg, unit));
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}`;
}
