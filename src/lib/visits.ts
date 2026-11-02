/** One gym visit: from punch-in to punch-out, stored in epoch ms. */
export interface Visit {
  in: number;
  out?: number;
  /** The leaving time was entered by hand the next time the app opened. */
  approx?: boolean;
  /** Asked when you left, and you did not remember. */
  noOut?: boolean;
}

export type Visits = Record<string, Visit>;

/** How far one tap of − or + moves a leaving time, and the shortest visit you can enter. */
export const LEAVE_STEP_MIN = 15;
const MINUTE = 60_000;
const DEFAULT_STAY_MIN = 60;

const pad = (n: number) => String(n).padStart(2, '0');

export const clockTime = (ms: number) => {
  const d = new Date(ms);
  const hour = d.getHours() % 12 || 12;
  return `${hour}:${pad(d.getMinutes())} ${d.getHours() < 12 ? 'am' : 'pm'}`;
};

/** Hours and minutes between two clock times, such as 1:05. Counts whole clock minutes, so 8:17 to 1:44 is 5:27 whatever the seconds. */
export const spentTime = (from: number, to: number) => {
  const minutes = Math.max(0, Math.floor(to / MINUTE) - Math.floor(from / MINUTE));
  return `${Math.floor(minutes / 60)}:${pad(minutes % 60)}`;
};

/** Reads stored visits, and turns the older date → punch-in records into visits. */
export function parseVisits(raw: string | null, oldPunches: string | null): Visits {
  const out: Visits = {};
  try {
    for (const [date, at] of Object.entries(JSON.parse(oldPunches ?? '{}') as Record<string, unknown>)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && typeof at === 'number') out[date] = { in: at };
    }
  } catch {
    // A damaged old record only loses that punch-in.
  }
  try {
    for (const [date, visit] of Object.entries(JSON.parse(raw ?? '{}') as Record<string, Visit>)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && typeof visit?.in === 'number') out[date] = visit;
    }
  } catch {
    // Same for a damaged visit list.
  }
  return out;
}

/** Earlier days still Present with no punch-out and no answer, oldest first. */
export function missedVisits(visits: Visits, statuses: Record<string, string | undefined>, today: string): { date: string; visit: Visit }[] {
  return Object.keys(visits)
    .filter((date) => date < today && statuses[date] === 'present' && visits[date].out == null && !visits[date].noOut)
    .sort()
    .map((date) => ({ date, visit: visits[date] }));
}

/** A leaving time must fall after the punch-in and before midnight. */
export function leaveBounds(punchedIn: number) {
  const midnight = new Date(punchedIn);
  midnight.setHours(23, 59, 0, 0);
  const max = midnight.getTime();
  return { min: Math.min(punchedIn + LEAVE_STEP_MIN * MINUTE, max), max };
}

export const defaultLeave = (punchedIn: number) => Math.min(punchedIn + DEFAULT_STAY_MIN * MINUTE, leaveBounds(punchedIn).max);

/** Moves a leaving time by whole steps, staying inside its bounds. */
export function stepLeave(punchedIn: number, at: number, steps: number) {
  const { min, max } = leaveBounds(punchedIn);
  return Math.min(max, Math.max(min, at + steps * LEAVE_STEP_MIN * MINUTE));
}
