/* ─────────────────────────── Types & limits ─────────────────────────── */

export type HeightUnit = 'cm' | 'ftin';

export interface WeightEntry {
  id: string;
  /** local calendar date, YYYY-MM-DD */
  date: string;
  /** epoch ms when it was logged */
  at: number;
  /** always kg */
  kg: number;
}

export interface BodyData {
  heightCm: number | null;
  heightUnit: HeightUnit;
  /** chronological, oldest first */
  entries: WeightEntry[];
}

export const emptyBody: BodyData = { heightCm: null, heightUnit: 'cm', entries: [] };

export const MIN_HEIGHT_CM = 100;
export const MAX_HEIGHT_CM = 250;
export const MIN_KG = 20;
export const MAX_KG = 400;
export const DEFAULT_KG = 70;
export const DEFAULT_HEIGHT_CM = 170;

/* ─────────────────────────── BMI engine ─────────────────────────── */

/** BMI = weight (kg) ÷ height (m)² */
export const bmiOf = (kg: number, heightCm: number) => kg / (heightCm / 100) ** 2;

const round1 = (n: number) => Math.round(n * 10) / 10;

export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese';

export interface CategoryMeta {
  key: BmiCategory;
  label: string;
  /** shown under the gauge */
  range: string;
  /** lower bound, inclusive */
  min: number;
  color: string;
}

/** Normal is green; every out-of-range band is System Red. */
export const BMI_CATEGORIES: CategoryMeta[] = [
  { key: 'underweight', label: 'Underweight', range: '< 18.5', min: 0, color: '#FF453A' },
  { key: 'normal', label: 'Normal Weight', range: '18.5 – 24.9', min: 18.5, color: '#30D158' },
  { key: 'overweight', label: 'Overweight', range: '25.0 – 29.9', min: 25, color: '#FF453A' },
  { key: 'obese', label: 'Obese', range: '≥ 30.0', min: 30, color: '#FF453A' },
];

export const categoryMeta = (key: BmiCategory) => BMI_CATEGORIES.find((c) => c.key === key)!;

/** Classified on the value you actually see (one decimal), so 24.96 reads "25.0 · Overweight". */
export function categoryOf(bmi: number): BmiCategory {
  const v = round1(bmi);
  if (v < 18.5) return 'underweight';
  if (v < 25) return 'normal';
  if (v < 30) return 'overweight';
  return 'obese';
}

/** Weight span (kg) that lands in the Normal band for a given height. */
export function normalRangeKg(heightCm: number): { min: number; max: number } {
  const m2 = (heightCm / 100) ** 2;
  return { min: 18.5 * m2, max: 24.9 * m2 };
}

/** How far a BMI sits outside the Normal band (0 when inside). */
export function bandDistance(bmi: number): number {
  const v = round1(bmi);
  if (v < 18.5) return 18.5 - v;
  if (v > 24.9) return v - 24.9;
  return 0;
}

export type Tone = 'toward' | 'away' | 'neutral';

/**
 * Colors a weight change by what it does to your BMI band rather than by direction alone:
 * moving toward Normal is good news, drifting further out is a heads-up, and staying put is neutral.
 */
export function deltaTone(prevKg: number, curKg: number, heightCm: number | null): Tone {
  if (heightCm == null) return 'neutral';
  const before = bandDistance(bmiOf(prevKg, heightCm));
  const after = bandDistance(bmiOf(curKg, heightCm));
  if (after < before - 1e-9) return 'toward';
  if (after > before + 1e-9) return 'away';
  return 'neutral';
}

/* ─────────────────────────── Height ─────────────────────────── */

export const clampHeightCm = (cm: number) => Math.min(MAX_HEIGHT_CM, Math.max(MIN_HEIGHT_CM, cm));

export const ftInToCm = (ft: number, inch: number) => (ft * 12 + inch) * 2.54;

/** Nearest whole inch, carrying 12″ into the next foot. */
export function cmToFtIn(cm: number): { ft: number; inch: number } {
  const total = Math.round(cm / 2.54);
  return { ft: Math.floor(total / 12), inch: total % 12 };
}

export function fmtHeight(cm: number, unit: HeightUnit): string {
  if (unit === 'cm') return `${Math.round(cm)} cm`;
  const { ft, inch } = cmToFtIn(cm);
  return `${ft}′ ${inch}″`;
}

/* ─────────────────────────── Entries ─────────────────────────── */

export interface EntryView extends WeightEntry {
  /** kg change vs the previous entry, null for the first */
  delta: number | null;
  prevKg: number | null;
}

/** Adds each entry's change vs the one before it. Input must be chronological. */
export function withDeltas(entries: WeightEntry[]): EntryView[] {
  return entries.map((e, i) => ({
    ...e,
    prevKg: i > 0 ? entries[i - 1].kg : null,
    delta: i > 0 ? e.kg - entries[i - 1].kg : null,
  }));
}

export const isValidKg = (kg: number) => Number.isFinite(kg) && kg >= MIN_KG && kg <= MAX_KG;

/** 12h clock, e.g. "8:05 AM". */
export function fmtTime(at: number): string {
  const d = new Date(at);
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Tolerant loader. Bad rows are dropped instead of crashing on launch. */
export function parseBody(raw: string | null): BodyData | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<BodyData>;
    const entries = Array.isArray(p.entries)
      ? p.entries
          .filter((e): e is WeightEntry => !!e && typeof e.id === 'string' && typeof e.date === 'string' && Number.isFinite(e.at) && isValidKg(e.kg))
          .sort((a, b) => a.at - b.at)
      : [];
    const h = typeof p.heightCm === 'number' && p.heightCm >= MIN_HEIGHT_CM && p.heightCm <= MAX_HEIGHT_CM ? p.heightCm : null;
    return { heightCm: h, heightUnit: p.heightUnit === 'ftin' ? 'ftin' : 'cm', entries };
  } catch {
    return null;
  }
}

/* ─────────────────────────── Gauge geometry ─────────────────────────── */

export const GAUGE_MIN = 15;
export const GAUGE_MAX = 40;
/** Segment edges on the BMI scale. */
export const GAUGE_EDGES = [GAUGE_MIN, 18.5, 25, 30, GAUGE_MAX] as const;
export const GAUGE_GAP = 4;

export interface GaugeSegment {
  key: BmiCategory;
  x: number;
  w: number;
  color: string;
}

/** Segment widths are proportional to their BMI span; 4pt gaps sit between them. */
export function gaugeSegments(width: number, gap = GAUGE_GAP): GaugeSegment[] {
  const usable = Math.max(0, width - gap * 3);
  const span = GAUGE_MAX - GAUGE_MIN;
  let x = 0;
  return BMI_CATEGORIES.map((c, i) => {
    const w = ((GAUGE_EDGES[i + 1] - GAUGE_EDGES[i]) / span) * usable;
    const seg = { key: c.key, x, w, color: c.color };
    x += w + gap;
    return seg;
  });
}

/** Marker centre (x) for a BMI, clamped to the scale. */
export function markerX(bmi: number, width: number, gap = GAUGE_GAP): number {
  const v = Math.min(GAUGE_MAX, Math.max(GAUGE_MIN, bmi));
  const segs = gaugeSegments(width, gap);
  let i = GAUGE_EDGES.findIndex((edge, idx) => idx < 4 && v < GAUGE_EDGES[idx + 1]);
  if (i === -1) i = 3;
  const lo = GAUGE_EDGES[i];
  const hi = GAUGE_EDGES[i + 1];
  return segs[i].x + ((v - lo) / (hi - lo)) * segs[i].w;
}
