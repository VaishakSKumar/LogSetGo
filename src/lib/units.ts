import type { Unit } from '../types';

const LB_PER_KG = 2.2046226218;

export const toDisplay = (kg: number, unit: Unit) => (unit === 'kg' ? kg : kg * LB_PER_KG);
export const fromDisplay = (value: number, unit: Unit) => (unit === 'kg' ? value : value / LB_PER_KG);

/** Smallest plate jump, in display units. */
export const stepFor = (unit: Unit) => (unit === 'kg' ? 2.5 : 5);

const round1 = (n: number) => Math.round(n * 10) / 10;

/** "82.5", "80" — one decimal at most, no trailing zero. */
export function fmtWeight(kg: number, unit: Unit): string {
  return String(round1(toDisplay(kg, unit)));
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
  const v = round1(toDisplay(deltaKg, unit));
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}`;
}
