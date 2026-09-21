import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  bmiOf,
  clampHeightCm,
  emptyBody,
  isValidKg,
  parseBody,
  withDeltas,
  type BodyData,
  type EntryView,
  type HeightUnit,
  type WeightEntry,
} from '../lib/body';
import { dateKey } from '../lib/dates';
import { buildDemoBody } from '../lib/demo';

const STORAGE_KEY = 'minimalist-gym-tracker/body/v1';

interface BodyContextValue {
  ready: boolean;
  data: BodyData;
  /** newest first, each with its change vs the entry before it */
  entries: EntryView[];
  /** the most recent logged weight, or null. It only changes when you log a new one. */
  latest: EntryView | null;
  /** current BMI, or null until there is both a weight and a height */
  bmi: number | null;
  actions: {
    /** Logs a weight now. Returns false if the value is out of range. */
    addWeight(kg: number): boolean;
    deleteEntry(id: string): void;
    setHeight(cm: number, unit: HeightUnit): void;
    /** Replaces the whole weight log and height (used by backup import). */
    replaceAll(next: BodyData): void;
  };
}

const BodyContext = createContext<BodyContextValue | null>(null);

export function useBody() {
  const ctx = useContext(BodyContext);
  if (!ctx) throw new Error('useBody must be used inside <BodyProvider>');
  return ctx;
}

export function BodyProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<BodyData>(emptyBody);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let stored: BodyData | null = null;
      try {
        stored = parseBody(await AsyncStorage.getItem(STORAGE_KEY));
      } catch {
        stored = null;
      }
      if (!stored && process.env.EXPO_PUBLIC_DEMO === '1') stored = buildDemoBody(dateKey());
      if (cancelled) return;
      if (stored) setData(stored);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
  }, [data, ready]);

  const value = useMemo<BodyContextValue>(() => {
    const views = withDeltas(data.entries);
    const latest = views.length ? views[views.length - 1] : null;
    return {
      ready,
      data,
      entries: [...views].reverse(),
      latest,
      bmi: latest && data.heightCm ? bmiOf(latest.kg, data.heightCm) : null,
      actions: {
        addWeight: (kg) => {
          if (!isValidKg(kg)) return false;
          const now = Date.now();
          const entry: WeightEntry = {
            id: `${now.toString(36)}${Math.random().toString(36).slice(2, 5)}`,
            date: dateKey(new Date(now)),
            at: now,
            kg,
          };
          setData((d) => ({ ...d, entries: [...d.entries, entry] }));
          return true;
        },
        deleteEntry: (id) => setData((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) })),
        replaceAll: (next) => setData(next),
        setHeight: (cm, unit) => setData((d) => ({ ...d, heightCm: clampHeightCm(cm), heightUnit: unit })),
      },
    };
  }, [data, ready]);

  return <BodyContext.Provider value={value}>{children}</BodyContext.Provider>;
}
