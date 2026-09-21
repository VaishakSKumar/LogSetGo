import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { attendanceStats, resolveStatuses, STATUSES, type AttendanceStats, type Marks, type Status, type StatusMap } from '../lib/attendance';
import { buildDemoAttendance, buildDemoData } from '../lib/demo';
import { useGym } from './gym';

const STORAGE_KEY = 'minimalist-gym-tracker/attendance/v1';

interface AttendanceContextValue {
  ready: boolean;
  /** what you explicitly tapped */
  marks: Marks;
  /** what the calendar shows: marks plus days derived from logged sets */
  statuses: StatusMap;
  stats: AttendanceStats;
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
      if (cancelled) return;
      if (stored) setMarks(stored);
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

  const statuses = useMemo(() => resolveStatuses(marks, data.sessions), [marks, data.sessions]);
  const stats = useMemo(() => attendanceStats(statuses, realToday), [statuses, realToday]);

  const value = useMemo<AttendanceContextValue>(
    () => ({
      ready,
      marks,
      statuses,
      stats,
      replaceMarks: (next) => setMarks(next),
      setStatus: (date, status) =>
        setMarks((m) => {
          const next = { ...m };
          if (status) next[date] = status;
          else delete next[date];
          return next;
        }),
    }),
    [ready, marks, statuses, stats],
  );

  return <AttendanceContext.Provider value={value}>{children}</AttendanceContext.Provider>;
}
