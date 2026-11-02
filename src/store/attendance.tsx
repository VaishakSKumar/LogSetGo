import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { attendanceStats, resolveStatuses, STATUSES, type AttendanceStats, type Marks, type Status, type StatusMap } from '../lib/attendance';
import { buildDemoAttendance, buildDemoData } from '../lib/demo';
import { missedVisits, parseVisits, type Visit, type Visits } from '../lib/visits';
import { useGym } from './gym';

const STORAGE_KEY = 'minimalist-gym-tracker/attendance/v1';
/** The older date → punch-in record. Read once, so a punch-in from before visits existed still counts. */
const PUNCH_KEY = 'minimalist-gym-tracker/attendance/punches/v1';
/** date → visit. Kept apart from the marks, so backups and older data are untouched. */
const VISIT_KEY = 'minimalist-gym-tracker/attendance/visits/v1';

interface AttendanceContextValue {
  ready: boolean;
  /** what you explicitly tapped */
  marks: Marks;
  /** what the calendar shows: marks plus days derived from logged sets */
  statuses: StatusMap;
  stats: AttendanceStats;
  /** When today's Present was punched in (epoch ms), if it was punched in on this device. */
  punchedAt: number | undefined;
  /** When today's visit was punched out, if it was. */
  punchedOutAt: number | undefined;
  /** The oldest earlier day still waiting for a leaving time. */
  missed: { date: string; visit: Visit } | undefined;
  punchOut(): void;
  undoPunchOut(): void;
  /** Saves roughly when you left a missed day. */
  saveLeft(date: string, at: number): void;
  /** You don't remember, so that day stays without a time. */
  skipLeft(date: string): void;
  /** Set a date's status, or `null` to clear your mark. */
  setStatus(date: string, status: Status | null): void;
  /** Replaces every mark (used by backup import). */
  replaceMarks(marks: Marks): void;
}

const AttendanceContext = createContext<AttendanceContextValue | null>(null);

export function useAttendance() {
  const ctx = useContext(AttendanceContext);
  if (!ctx) throw new Error('useAttendance must be used inside <AttendanceProvider>');
  return ctx;
}

/** Tolerant loader: drops anything that isn't a valid date → status pair. */
function parseMarks(raw: string | null): Marks | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Marks = {};
    for (const [date, status] of Object.entries(parsed)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && STATUSES.includes(status as Status)) out[date] = status as Status;
    }
    return out;
  } catch {
    return null;
  }
}

export function AttendanceProvider({ children }: { children: ReactNode }) {
  const { data, realToday } = useGym();
  const [marks, setMarks] = useState<Marks>({});
  const [visits, setVisits] = useState<Visits>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let stored: Marks | null = null;
      try {
        stored = parseMarks(await AsyncStorage.getItem(STORAGE_KEY));
      } catch {
        stored = null;
      }
      if (!stored && process.env.EXPO_PUBLIC_DEMO === '1') {
        stored = buildDemoAttendance(realToday, buildDemoData(realToday).sessions);
      }
      let storedVisits: Visits = {};
      try {
        storedVisits = parseVisits(await AsyncStorage.getItem(VISIT_KEY), await AsyncStorage.getItem(PUNCH_KEY));
      } catch {
        storedVisits = {};
      }
      if (cancelled) return;
      if (stored) setMarks(stored);
      setVisits(storedVisits);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(marks)).catch(() => {});
  }, [marks, ready]);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(VISIT_KEY, JSON.stringify(visits)).catch(() => {});
    if (ready) AsyncStorage.removeItem(PUNCH_KEY).catch(() => {});
  }, [visits, ready]);

  const statuses = useMemo(() => resolveStatuses(marks, data.sessions), [marks, data.sessions]);
  const stats = useMemo(() => attendanceStats(statuses, realToday), [statuses, realToday]);

  const value = useMemo<AttendanceContextValue>(
    () => ({
      ready,
      marks,
      statuses,
      stats,
      punchedAt: visits[realToday]?.in,
      punchedOutAt: visits[realToday]?.out,
      missed: missedVisits(visits, statuses, realToday)[0],
      punchOut: () => setVisits((v) => (v[realToday] ? { ...v, [realToday]: { ...v[realToday], out: Date.now() } } : v)),
      undoPunchOut: () =>
        setVisits((v) => {
          if (!v[realToday]) return v;
          const { out: _out, ...open } = v[realToday];
          return { ...v, [realToday]: open };
        }),
      saveLeft: (date, at) => setVisits((v) => (v[date] ? { ...v, [date]: { ...v[date], out: at, approx: true } } : v)),
      skipLeft: (date) => setVisits((v) => (v[date] ? { ...v, [date]: { ...v[date], noOut: true } } : v)),
      replaceMarks: (next) => setMarks(next),
      setStatus: (date, status) => {
        setMarks((m) => {
          const next = { ...m };
          if (status) next[date] = status;
          else delete next[date];
          return next;
        });
        setVisits((v) => {
          // Only today's Present is a punch-in.
          if (status === 'present' && date === realToday) return v[date] ? v : { ...v, [date]: { in: Date.now() } };
          if (status === 'present' || !v[date]) return v;
          const { [date]: _gone, ...rest } = v;
          return rest;
        });
      },
    }),
    [ready, marks, statuses, stats, visits, realToday],
  );

  return <AttendanceContext.Provider value={value}>{children}</AttendanceContext.Provider>;
}
