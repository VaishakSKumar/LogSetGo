/* ─────────────────────────── Constants & formatting ─────────────────────────── */

export const PRESETS = [30, 60, 90, 120] as const;
export const DEFAULT_REST_SECONDS = 90;
/** The countdown turns amber for the final 10 seconds. */
export const WARN_MS = 10_000;
export const MAX_SAVED = 20;
export const MAX_CUSTOM_SECONDS = 59 * 60 + 55;

/** 105 → "1:45" */
export function fmt(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export interface SavedTimer {
  id: string;
  label: string;
  seconds: number;
}

export interface TimerSettings {
  saved: SavedTimer[];
  /** used by auto-start after a set is logged */
  defaultSeconds: number;
  autoStart: boolean;
}

export const defaultTimerSettings: TimerSettings = {
  saved: [],
  defaultSeconds: DEFAULT_REST_SECONDS,
  autoStart: true,
};

/** Tolerant loader: anything malformed falls back to defaults rather than crashing on launch. */
export function parseTimerSettings(raw: string | null): TimerSettings {
  if (!raw) return defaultTimerSettings;
  try {
    const p = JSON.parse(raw) as Partial<TimerSettings>;
    const saved = Array.isArray(p.saved)
      ? p.saved.filter(
          (t): t is SavedTimer =>
            !!t && typeof t.id === 'string' && typeof t.label === 'string' && Number.isFinite(t.seconds) && t.seconds > 0,
        )
      : [];
    return {
      saved,
      defaultSeconds:
        typeof p.defaultSeconds === 'number' && p.defaultSeconds > 0 ? p.defaultSeconds : DEFAULT_REST_SECONDS,
      autoStart: typeof p.autoStart === 'boolean' ? p.autoStart : true,
    };
  } catch {
    return defaultTimerSettings;
  }
}

/** Name for a new saved timer: trimmed, capped, never empty. */
export const tidyTimerLabel = (raw: string, seconds: number) => raw.trim().replace(/\s+/g, ' ').slice(0, 24) || `Rest ${fmt(seconds)}`;

/* ─────────────────────────── Countdown engine (pure) ─────────────────────────── */

export type TimerStatus = 'idle' | 'running' | 'paused' | 'done';

/**
 * Timestamp-based, so the countdown stays correct if the app is backgrounded or JS timers drift.
 * `total` grows with +15s so the progress bar stays honest.
 */
export interface TimerState {
  status: TimerStatus;
  /** ms */
  total: number;
  /** epoch ms when a running timer hits zero */
  endsAt: number;
  /** ms remaining while paused */
  left: number;
  label: string | null;
  /** bumps on every start so stale timeouts can be ignored */
  runId: number;
}

export const idleTimer: TimerState = { status: 'idle', total: 0, endsAt: 0, left: 0, label: null, runId: 0 };

export function startTimer(prev: TimerState, seconds: number, label: string | null, now: number): TimerState {
  const total = Math.max(1, seconds) * 1000;
  return { status: 'running', total, endsAt: now + total, left: total, label, runId: prev.runId + 1 };
}

export function remainingMs(s: TimerState, now: number): number {
  switch (s.status) {
    case 'running':
      return Math.max(0, s.endsAt - now);
    case 'paused':
      return s.left;
    default:
      return 0;
  }
}

export function pauseTimer(s: TimerState, now: number): TimerState {
  return s.status === 'running' ? { ...s, status: 'paused', left: remainingMs(s, now) } : s;
}

export function resumeTimer(s: TimerState, now: number): TimerState {
  return s.status === 'paused' ? { ...s, status: 'running', endsAt: now + s.left } : s;
}

/** +15s while running or paused. Ignored once finished. */
export function addSeconds(s: TimerState, seconds: number, now: number): TimerState {
  const ms = seconds * 1000;
  if (s.status === 'running') return { ...s, endsAt: s.endsAt + ms, total: s.total + ms };
  if (s.status === 'paused') return { ...s, left: s.left + ms, total: s.total + ms };
  return s;
}

/** Reaches zero. No-op unless it genuinely ran out. */
export function finishTimer(s: TimerState, now: number): TimerState {
  return s.status === 'running' && remainingMs(s, now) <= 0 ? { ...s, status: 'done', left: 0 } : s;
}

export const skipTimer = (s: TimerState): TimerState => ({ ...s, status: 'idle', left: 0, endsAt: 0, label: null });

export const isWarning = (s: TimerState, now: number) => {
  const left = remainingMs(s, now);
  return s.status === 'running' && left > 0 && left <= WARN_MS;
};

/** 1 → full, 0 → empty */
export const progressOf = (s: TimerState, now: number) =>
  s.status === 'done' ? 0 : s.total > 0 ? Math.min(1, remainingMs(s, now) / s.total) : 0;
