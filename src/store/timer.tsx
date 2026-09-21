import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { haptic } from '../lib/haptics';
import { cancelRestAlert, scheduleRestAlert, setDailyReminder } from '../lib/notify';
import {
  MAX_SAVED,
  addSeconds,
  defaultTimerSettings,
  finishTimer,
  idleTimer,
  parseTimerSettings,
  pauseTimer,
  remainingMs,
  restAlertPlan,
  resumeTimer,
  skipTimer,
  startTimer,
  tidyTimerLabel,
  type SavedTimer,
  type TimerSettings,
  type TimerState,
} from '../lib/timer';

const STORAGE_KEY = 'minimalist-gym-tracker/timer/v1';
const KEEP_AWAKE_TAG = 'rest-timer';
/** how long the "0:00" state lingers before the banner leaves on its own */
const DONE_LINGER_MS = 6_000;

export interface TimerControls {
  start(seconds: number, label?: string | null): void;
  pause(): void;
  resume(): void;
  addTime(seconds: number): void;
  /** Skip a running timer, or dismiss a finished one. */
  skip(): void;
  saveTimer(seconds: number, label: string): SavedTimer | null;
  deleteTimer(id: string): void;
  setDefaultSeconds(seconds: number): void;
  setAutoStart(on: boolean): void;
  setAlerts(on: boolean): void;
  setReminderHour(hour: number | null): void;
  /** Replaces saved timers and preferences (used by backup import). */
  replaceSettings(next: TimerSettings): void;
}

interface TimerContextValue {
  timer: TimerState;
  settings: TimerSettings;
  controls: TimerControls;
}

const TimerContext = createContext<TimerContextValue | null>(null);

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used inside <TimerProvider>');
  return ctx;
}

/** Re-renders roughly 5×/second while `active`, returning the current epoch ms. */
export function useNow(active: boolean, intervalMs = 200) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
  return active ? now : Date.now();
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [timer, setTimer] = useState<TimerState>(idleTimer);
  const [settings, setSettings] = useState<TimerSettings>(defaultTimerSettings);
  const [loaded, setLoaded] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  /* ── persistence ── */
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => setSettings(parseTimerSettings(raw)))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings)).catch(() => {});
  }, [settings, loaded]);

  /* ── run to zero: one timeout aimed at the end timestamp ── */
  useEffect(() => {
    if (timer.status !== 'running') return;
    const id = setTimeout(
      () => {
        setTimer((s) => finishTimer(s, Date.now()));
        haptic.timerDone();
      },
      Math.max(0, timer.endsAt - Date.now()),
    );
    return () => clearTimeout(id);
  }, [timer.status, timer.endsAt, timer.runId]);

  // Backgrounded past zero? Settle as soon as the app is foregrounded again.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') return;
      setTimer((cur) => (cur.status === 'running' && remainingMs(cur, Date.now()) <= 0 ? finishTimer(cur, Date.now()) : cur));
    });
    return () => sub.remove();
  }, []);

  // Phone-level alert for when a rest ends with the app closed (iOS / Android apps only).
  useEffect(() => {
    if (!loaded) return;
    const plan = restAlertPlan(timer, settings.alerts, Date.now());
    if (plan.action === 'schedule') void scheduleRestAlert(plan.seconds, timer.label);
    else void cancelRestAlert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.status, timer.endsAt, timer.runId, settings.alerts, loaded]);

  useEffect(() => {
    if (loaded) void setDailyReminder(settings.reminderHour);
  }, [settings.reminderHour, loaded]);

  // A finished timer clears itself.
  useEffect(() => {
    if (timer.status !== 'done') return;
    const id = setTimeout(() => setTimer(skipTimer), DONE_LINGER_MS);
    return () => clearTimeout(id);
  }, [timer.status, timer.runId]);

  // Keep the screen on while there's a countdown to read.
  const live = timer.status === 'running' || timer.status === 'paused' || timer.status === 'done';
  useEffect(() => {
    if (!live) return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [live]);

  /* ── controls ── */
  const start = useCallback((seconds: number, label: string | null = null) => {
    const now = Date.now();
    setTimer((s) => startTimer(s, seconds, label, now));
  }, []);

  const controls = useMemo<TimerControls>(
    () => ({
      start,
      pause: () => {
        const now = Date.now();
        setTimer((s) => pauseTimer(s, now));
      },
      resume: () => {
        const now = Date.now();
        setTimer((s) => resumeTimer(s, now));
      },
      addTime: (seconds) => {
        const now = Date.now();
        setTimer((s) => addSeconds(s, seconds, now));
      },
      skip: () => setTimer(skipTimer),
      saveTimer: (seconds, label) => {
        const cur = settingsRef.current;
        if (seconds <= 0 || cur.saved.length >= MAX_SAVED) return null;
        const timer: SavedTimer = {
          id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
          label: tidyTimerLabel(label, seconds),
          seconds,
        };
        setSettings((s) => ({ ...s, saved: [...s.saved, timer] }));
        return timer;
      },
      deleteTimer: (id) => setSettings((s) => ({ ...s, saved: s.saved.filter((t) => t.id !== id) })),
      setDefaultSeconds: (seconds) => setSettings((s) => ({ ...s, defaultSeconds: seconds })),
      setAutoStart: (on) => setSettings((s) => ({ ...s, autoStart: on })),
      setAlerts: (on) => setSettings((s) => ({ ...s, alerts: on })),
      setReminderHour: (hour) => setSettings((s) => ({ ...s, reminderHour: hour })),
      replaceSettings: (next) => setSettings(next),
    }),
    [start],
  );

  const value = useMemo(() => ({ timer, settings, controls }), [timer, settings, controls]);
  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}
