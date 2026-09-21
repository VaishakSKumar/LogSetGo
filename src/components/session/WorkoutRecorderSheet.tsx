import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { haptic } from '../../lib/haptics';
import { fmtVolume, toDisplay } from '../../lib/units';
import { useTimer } from '../../store/timer';
import { colors } from '../../theme';
import type { Exercise, Ghost, HistoryEntry, SetPerf, SetRow, Unit } from '../../types';
import { ExerciseChips } from '../ExerciseChips';
import { ExerciseGoalCard } from '../ExerciseGoalCard';
import { ExerciseInsights } from '../ExerciseInsights';
import { LogDock } from '../LogDock';
import { RestBanner } from '../RestBanner';
import { SetDetailsSheet } from '../sheets/SetDetailsSheet';
import { SetTable } from '../SetTable';
import { TimerDashboard } from '../TimerDashboard';
import { AnimatedNumber } from './AnimatedNumber';
import { BottomDrawer } from './BottomDrawer';

/** Live totals: they count up the instant a set is checked off (and back down if it's undone). */
function VolumeReadout({ exerciseKg, dayKg, unit }: { exerciseKg: number; dayKg: number; unit: Unit }) {
  const ex = Math.round(toDisplay(exerciseKg, unit));
  const day = Math.round(toDisplay(dayKg, unit));
  return (
    <View
      className="flex-row rounded-3xl border p-4"
      style={{ backgroundColor: colors.surface, borderColor: colors.line }}
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Volume: ${fmtVolume(exerciseKg, unit)} ${unit} this exercise, ${fmtVolume(dayKg, unit)} ${unit} today`}
    >
      <View className="flex-1">
        <Text className="text-meta text-muted">This exercise</Text>
        <View className="flex-row items-baseline gap-1">
          <AnimatedNumber value={ex} className="text-metric text-label" />
          <Text className="text-meta text-muted">{unit}</Text>
        </View>
      </View>
      <View className="flex-1 items-end">
        <Text className="text-meta text-muted">Today’s total</Text>
        <View className="flex-row items-baseline gap-1">
          <AnimatedNumber value={day} className="text-metric text-label" />
          <Text className="text-meta text-muted">{unit}</Text>
        </View>
      </View>
    </View>
  );
}

interface Props {
  visible: boolean;
  /** Dismissed without pressing Done (drag down, backdrop, back button). Checked sets are already saved. */
  onClose: () => void;
  /** Done pressed with something to save. The screen closes the drawer and shows the summary. */
  onDone: () => void;
  /** The search bar (it owns its own open/closed state, which the screen needs to know about). */
  search: ReactNode;
  searching: boolean;
  active: Exercise | null;
  rows: SetRow[];
  ghosts: Ghost[];
  prevSets: SetPerf[] | undefined;
  entries: HistoryEntry[] | undefined;
  /** "Last time · 3 days ago · 60 × 8 · 60 × 8", or null for a first-ever session */
  lastTime: string | null;
  unit: Unit;
  step: number;
  today: string;
  activeIndex: number;
  activeRow: SetRow | undefined;
  exerciseKg: number;
  dayKg: number;
  onChange: (rowId: string, field: 'weight' | 'reps', value: number | null) => void;
  onLog: (rowId: string, weight: number, reps: number) => void;
  onAdd: () => void;
  onRemove: () => void;
  onApply: (sets: SetPerf[]) => void;
}

/**
 * The workout recorder drawer, top to bottom: search (with ✕) → last time → set rows and "Add set"
 * → live volume → rest timer, overload hint and goal. The footer is pinned: the running rest
 * countdown, the ± steppers for the active set, and the Done button.
 */
export function WorkoutRecorderSheet(p: Props) {
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const anyLogged = p.rows.some((r) => r.done);

  // A hint belongs to the moment you pressed Done: drop it as soon as anything changes.
  useEffect(() => setHint(null), [anyLogged, p.active?.id, p.visible]);

  const done = () => {
    if (!p.active) {
      p.onClose(); // nothing picked, nothing to save
      return;
    }
    if (!anyLogged) {
      haptic.warn();
      setHint('Check off at least one set to save it. Or drag down to leave without saving.');
      return;
    }
    haptic.pulse(); // impactLight
    p.onDone();
  };

  const footer = (
    <View>
      <RestBannerSlot />
      <LogDock
        compact
        activeRow={p.activeRow}
        activeIndex={p.activeIndex}
        ghost={p.activeIndex >= 0 ? p.ghosts[p.activeIndex] : undefined}
        unit={p.unit}
        step={p.step}
        onChange={p.onChange}
        onLog={p.onLog}
        onAdd={p.onAdd}
      />
      {hint ? (
        <Text className="px-4 pt-3 text-center text-meta" style={{ color: colors.warn }} accessibilityLiveRegion="polite">
          {hint}
        </Text>
      ) : null}
      <View className="px-4 pt-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done"
          onPress={done}
          className="items-center justify-center rounded-full bg-accent active:opacity-80"
          style={{ height: 50 }}
        >
          <Text className="text-h2 font-bold text-black">Done</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <BottomDrawer
      visible={p.visible}
      onClose={p.onClose}
      footer={footer}
      label="Record exercise"
      overlays={
        // Inside the drawer's own modal, so it stacks on top of it (a Modal opened from a Modal).
        <SetDetailsSheet
          visible={detailsId != null}
          onClose={() => setDetailsId(null)}
          row={p.rows.find((r) => r.id === detailsId)}
          index={Math.max(0, p.rows.findIndex((r) => r.id === detailsId))}
        />
      }
    >
      {p.search}

      {p.searching ? null : (
        <>
          <ExerciseChips />

          {p.active ? (
            <>
              <Text className="-mb-2 px-1 text-meta text-muted" accessibilityLabel={p.lastTime ?? `First time logging ${p.active.name}`}>
                {p.lastTime ?? `First time logging ${p.active.name}. Today’s sets become your baseline.`}
              </Text>
              <SetTable
                rows={p.rows}
                ghosts={p.ghosts}
                prevSets={p.prevSets}
                unit={p.unit}
                activeRowId={p.activeRow?.id}
                onChange={p.onChange}
                onLog={p.onLog}
                onAdd={p.onAdd}
                onRemove={p.onRemove}
                onDetails={setDetailsId}
              />
              <VolumeReadout exerciseKg={p.exerciseKg} dayKg={p.dayKg} unit={p.unit} />
              <TimerDashboard />
              <ExerciseInsights exercise={p.active} entries={p.entries} rows={p.rows} today={p.today} unit={p.unit} step={p.step} onApply={p.onApply} />
              <ExerciseGoalCard exercise={p.active} entries={p.entries} />
            </>
          ) : (
            <View className="items-center px-6 py-6">
              <Text className="text-h2 text-label">Pick an exercise to start</Text>
              <Text className="mt-1 text-center text-body text-muted">Your last weight and reps are filled in as grey suggestions. Tap a box to accept it, or just tap the check.</Text>
            </View>
          )}
        </>
      )}

    </BottomDrawer>
  );
}

/** The running rest countdown, shown only while a timer is active. */
function RestBannerSlot() {
  const { timer } = useTimer();
  if (timer.status === 'idle') return null;
  return (
    <View className="px-4 pt-3">
      <RestBanner />
    </View>
  );
}
