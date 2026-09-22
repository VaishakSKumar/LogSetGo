/** Whole, non-negative seconds only — never negative, never fractional. */
const clampSeconds = (n: number) => Math.max(0, Math.round(n));

/** 45 -> "0:45", 70 -> "1:10", 125 -> "2:05". Minutes are never padded past their own digit count. */
export function formatDuration(totalSeconds: number): string {
  const s = clampSeconds(totalSeconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

/**
 * Free-typed duration text -> whole seconds, or null if it isn't one.
 *  · "70"      -> 70 (bare seconds)
 *  · "1:10"    -> 70 (MM:SS; SS must be 0-59)
 *  · "1:"      -> 60 (a trailing empty seconds part reads as :00)
 * Blank, negative, non-numeric or an out-of-range seconds part (60+) all return null.
 */
export function parseDurationInput(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    if (parts.length !== 2) return null;
    const [minPart, secPart] = parts;
    const minutes = Number(minPart);
    const seconds = secPart === '' ? 0 : Number(secPart);
    if (!Number.isFinite(minutes) || minutes < 0 || !Number.isInteger(minutes)) return null;
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 59 || !Number.isInteger(seconds)) return null;
    const total = minutes * 60 + seconds;
    return total > 0 ? total : null;
  }

  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}
