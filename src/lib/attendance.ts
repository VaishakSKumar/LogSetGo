import type { Session } from '../types';
import { addDays } from './dates';

export type Status = 'present' | 'absent' | 'holiday';

/** Strict badge + color rules for every date tile. */
export const STATUS_META: Record<Status, { label: string; letter: string; color: string }> = {
  present: { label: 'Present', letter: 'P', color: '#30D158' },
  absent: { label: 'Absent', letter: 'A', color: '#FF453A' },
  holiday: { label: 'Holiday', letter: 'H', color: '#FFD60A' },
};

export const STATUSES: Status[] = ['present', 'absent', 'holiday'];

/**
 * Holidays are excused days, so by default they stay out of the attendance-rate denominator.
 * Flip this to count them as "logged days".
 */
export const COUNT_HOLIDAYS_IN_RATE = false;

export type Marks = Record<string, Status>;
export type StatusMap = Record<string, Status>;

const hasLoggedSets = (s: Session) =>
  Object.values(s.exercises).some((rows) => rows.some((r) => r.done && r.weight != null && r.reps != null));

/**
 * What the calendar shows for each date: your explicit mark wins; otherwise any day
 * with logged sets counts as Present, so training history is never invisible.
 */
export function resolveStatuses(marks: Marks, sessions: Record<string, Session>): StatusMap {
  const out: StatusMap = {};
  for (const [date, session] of Object.entries(sessions)) {
    if (hasLoggedSets(session)) out[date] = 'present';
  }
  return { ...out, ...marks };
}

export interface AttendanceStats {
  present: number;
  absent: number;
  holiday: number;
  /** days the rate is measured over */
  logged: number;
  /** 0–100, or null before anything is logged */
  rate: number | null;
  streak: number;
}

/**
 * Consecutive present days ending today.
 *  · Present adds one.
 *  · Holiday pauses the streak (neither adds nor breaks).
 *  · Absent, or a past day you never marked, breaks it.
 *  · Today only counts once it's Present; while it's unmarked the day is still in progress.
 */
export function streakOf(map: StatusMap, todayKey: string): number {
  const dates = Object.keys(map);
  if (!dates.length) return 0;
  const earliest = dates.reduce((a, b) => (a < b ? a : b));

  let streak = 0;
  const now = map[todayKey];
  if (now === 'absent') return 0;
  if (now === 'present') streak++;

  for (let d = addDays(todayKey, -1); d >= earliest; d = addDays(d, -1)) {
    const s = map[d];
    if (s === 'present') streak++;
    else if (s !== 'holiday') break;
  }
  return streak;
}

export function attendanceStats(map: StatusMap, todayKey: string): AttendanceStats {
  let present = 0;
  let absent = 0;
  let holiday = 0;
  for (const s of Object.values(map)) {
    if (s === 'present') present++;
    else if (s === 'absent') absent++;
    else holiday++;
  }
  const logged = present + absent + (COUNT_HOLIDAYS_IN_RATE ? holiday : 0);
  return {
    present,
    absent,
    holiday,
    logged,
    rate: logged > 0 ? Math.round((present / logged) * 100) : null,
    streak: streakOf(map, todayKey),
  };
}

export const isFuture = (date: string, todayKey: string) => date > todayKey;

/** Gym Progress is open only for a date that resolves to Present (tapped, or derived from logged sets). */
export const canLog = (map: StatusMap, date: string) => map[date] === 'present';
