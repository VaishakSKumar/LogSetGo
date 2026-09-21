import type { AppData, Exercise } from '../types';
import { STATUSES, type Marks, type Status } from './attendance';
import { mergeAppData, normalizeAppData } from './appdata';
import { emptyBody, parseBody, type BodyData } from './body';
import { defaultTimerSettings, parseTimerSettings, type TimerSettings } from './timer';

export const BACKUP_APP = 'LogSetGo';
export const BACKUP_SCHEMA = 1;

/** Everything the app stores, in one file. */
export interface Backup {
  app: typeof BACKUP_APP;
  schema: typeof BACKUP_SCHEMA;
  exportedAt: string;
  gym: AppData;
  attendance: Marks;
  body: BodyData;
  timer: TimerSettings;
}

export interface BackupParts {
  gym: AppData;
  attendance: Marks;
  body: BodyData;
  timer: TimerSettings;
}

export function buildBackup(parts: BackupParts, now: Date = new Date()): Backup {
  return { app: BACKUP_APP, schema: BACKUP_SCHEMA, exportedAt: now.toISOString(), ...parts };
}

const pad = (n: number) => String(n).padStart(2, '0');
export const backupFileName = (now: Date = new Date(), ext: 'json' | 'csv' = 'json', kind = 'backup') =>
  `LogSetGo-${kind}-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.${ext}`;

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: string };

/** Reads a backup file. Never throws: bad input becomes a readable error. */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file isn’t valid JSON.' };
  }
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'That file isn’t a LogSetGo backup.' };
  const r = raw as Record<string, unknown>;
  if (r.app !== BACKUP_APP) return { ok: false, error: 'That file isn’t a LogSetGo backup.' };
  if (typeof r.schema !== 'number' || r.schema > BACKUP_SCHEMA) {
    return { ok: false, error: 'This backup is from a newer version of LogSetGo. Update the app and try again.' };
  }
  const gym = normalizeAppData(r.gym);
  if (!gym) return { ok: false, error: 'The workout data in this backup is damaged.' };

  const marks: Marks = {};
  if (r.attendance && typeof r.attendance === 'object') {
    for (const [date, status] of Object.entries(r.attendance as Record<string, unknown>)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && STATUSES.includes(status as Status)) marks[date] = status as Status;
    }
  }
  return {
    ok: true,
    backup: {
      app: BACKUP_APP,
      schema: BACKUP_SCHEMA,
      exportedAt: typeof r.exportedAt === 'string' ? r.exportedAt : '',
      gym,
      attendance: marks,
      body: parseBody(JSON.stringify(r.body ?? null)) ?? emptyBody,
      timer: r.timer ? parseTimerSettings(JSON.stringify(r.timer)) : defaultTimerSettings,
    },
  };
}

/** Summary shown before you confirm an import. */
export function describeBackup(b: Backup) {
  const dates = Object.keys(b.gym.sessions);
  const sets = Object.values(b.gym.sessions).reduce(
    (n, s) => n + Object.values(s.exercises).reduce((m, rows) => m + rows.filter((r) => r.done).length, 0),
    0,
  );
  return {
    workouts: dates.length,
    sets,
    attendanceMarks: Object.keys(b.attendance).length,
    weights: b.body.entries.length,
    routines: b.gym.routines.length,
    exportedAt: b.exportedAt,
  };
}

/** "Merge" keeps everything you have and adds what's missing. Nothing you have is overwritten. */
export function mergeBackups(current: BackupParts, incoming: Backup): BackupParts {
  const seen = new Set(current.body.entries.map((e) => e.id));
  return {
    gym: mergeAppData(current.gym, incoming.gym),
    attendance: { ...incoming.attendance, ...current.attendance },
    body: {
      heightCm: current.body.heightCm ?? incoming.body.heightCm,
      heightUnit: current.body.heightCm != null ? current.body.heightUnit : incoming.body.heightUnit,
      entries: [...current.body.entries, ...incoming.body.entries.filter((e) => !seen.has(e.id))].sort((a, b) => a.at - b.at),
    },
    timer: {
      ...current.timer,
      saved: [...current.timer.saved, ...incoming.timer.saved.filter((t) => !current.timer.saved.some((s) => s.id === t.id))],
    },
  };
}

/* ─────────────────────────── CSV ─────────────────────────── */

const cell = (v: string | number | boolean | null | undefined) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const row = (cols: (string | number | boolean | null | undefined)[]) => cols.map(cell).join(',');

/** One line per logged set, ready for a spreadsheet. Weights are kg. */
export function setsToCsv(gym: AppData, exercises: Exercise[]): string {
  const names = new Map(exercises.map((e) => [e.id, e.name]));
  const lines = [row(['date', 'workout', 'exercise', 'set', 'weight_kg', 'reps', 'warmup', 'rpe', 'note'])];
  for (const date of Object.keys(gym.sessions).sort()) {
    const s = gym.sessions[date];
    for (const [id, rows] of Object.entries(s.exercises)) {
      rows
        .filter((r) => r.done)
        .forEach((r, i) => lines.push(row([date, s.label, names.get(id) ?? id, i + 1, r.weight, r.reps, r.warmup ? 'yes' : '', r.rpe, r.note])));
    }
  }
  return lines.join('\r\n') + '\r\n';
}

/** Body-weight log as CSV. */
export function weightsToCsv(body: BodyData): string {
  const lines = [row(['date', 'time_iso', 'weight_kg'])];
  for (const e of body.entries) lines.push(row([e.date, new Date(e.at).toISOString(), Number(e.kg.toFixed(2))]));
  return lines.join('\r\n') + '\r\n';
}
