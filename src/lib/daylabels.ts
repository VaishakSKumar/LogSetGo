import { tidyName } from './search';
import { DAY_LABELS } from './progress';

/** Longest a custom day name can be (keeps it readable in the header at 20pt). */
export const MAX_DAY_LABEL_LENGTH = 28;
/** Most custom day names kept at once; adding past this drops the oldest. */
export const MAX_CUSTOM_DAY_LABELS = 20;

/** Quick-suggestion chips in the "Add custom day" sheet. Tapping one fills the input; it doesn't save by itself. */
export const DAY_NAME_PRESETS = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Cardio'];

const sameLabel = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Trims, collapses whitespace, title-cases, and caps length. Empty input stays empty. */
export const normalizeDayLabel = (raw: string): string => tidyName(raw).slice(0, MAX_DAY_LABEL_LENGTH);

/** True for one of the app's fixed day names (Push A, Upper, ...), never a custom one. */
export const isDefaultDayLabel = (label: string): boolean => DAY_LABELS.some((d) => sameLabel(d, label));

/**
 * Adds `label` to the front of your custom list (newest first), replacing any earlier entry that
 * only differed by case, so you never end up with "Legs Day" and "legs day" side by side. A default
 * day name, or empty input, changes nothing — those already have their place in the picker.
 */
export function addCustomDayLabel(existing: string[], raw: string): string[] {
  const label = normalizeDayLabel(raw);
  if (!label || isDefaultDayLabel(label)) return existing;
  const rest = existing.filter((l) => !sameLabel(l, label));
  return [label, ...rest].slice(0, MAX_CUSTOM_DAY_LABELS);
}

/** Removes one custom day name (case-insensitive). Days already logged under it keep their label. */
export function removeCustomDayLabel(existing: string[], label: string): string[] {
  return existing.filter((l) => !sameLabel(l, label));
}

/* ─────────────────────────── Hiding a built-in default ─────────────────────────── */

/**
 * Built-ins can't be deleted outright (there's nothing to re-type, unlike a custom name), so
 * removing one from the Defaults list "hides" it instead — reversible from the same picker.
 * A day already logged under it keeps its label, same as a removed custom name.
 */
export function hideDefaultDayLabel(hidden: string[], raw: string): string[] {
  const canonical = DAY_LABELS.find((d) => sameLabel(d, raw));
  if (!canonical || hidden.some((l) => sameLabel(l, canonical))) return hidden;
  return [...hidden, canonical];
}

/** The built-in day names that still show up in the picker. */
export function visibleDefaultDayLabels(hidden: string[]): string[] {
  return DAY_LABELS.filter((d) => !hidden.some((l) => sameLabel(l, d)));
}
