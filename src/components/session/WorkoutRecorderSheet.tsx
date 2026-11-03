import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { formatDuration } from '../../lib/duration';
import { haptic } from '../../lib/haptics';
import { loadOf } from '../../lib/progress';
import { exerciseReps } from '../../lib/session';
import { fmtVolume, toDisplay } from '../../lib/units';
import { fmt, progressOf, remainingMs } from '../../lib/timer';
import { useNow, useTimer } from '../../store/timer';
import { colors, fonts } from '../../theme';
import type { Exercise, Ghost, HistoryEntry, SetMode, SetPerf, SetRow, Unit } from '../../types';
import { ExerciseGoalCard } from '../ExerciseGoalCard';
import { ExerciseInsights } from '../ExerciseInsights';
import { LogDock } from '../LogDock';
import { SetDetailsSheet } from '../sheets/SetDetailsSheet';
import { SetTable } from '../SetTable';
import { WeekProgressCard } from './WeekProgressCard';
import { TimerDashboard } from '../TimerDashboard';
import { AnimatedNumber } from './AnimatedNumber';
import { BottomDrawer } from './BottomDrawer';
import { ExerciseMedia } from './ExerciseMedia';
import { ModeToggle, UnitToggle } from './ModeToggle';
import { RestOverlay } from './RestOverlay';

/** Live totals: they count up the instant a set is checked off (and back down if it's undone). */
function VolumeReadout({ exerciseKg, tutSeconds, reps, dayKg, unit, mode }: { exerciseKg: number; tutSeconds: number; reps: number; dayKg: number; unit: Unit; mode: SetMode }) {
  const repsOnly = reps > 0 && exerciseKg === 0;
  const day = Math.round(toDisplay(dayKg, unit));
  const withUnit = (n: number) => `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} ${unit}`;
  return (
    <View
      className="flex-row justify-between"
      style={{ paddingVertical: 10, paddingHorizontal: 14, gap: 12, borderRadius: 16, backgroundColor: colors.raised }}
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={
        mode === 'time'
          ? `Time under tension: ${formatDuration(tutSeconds)} this exercise. Today's total volume: ${fmtVolume(dayKg, unit)} ${unit}`
          : repsOnly
            ? `${reps} reps this exercise, ${fmtVolume(dayKg, unit)} ${unit} today`
            : `Volume: ${fmtVolume(exerciseKg, unit)} ${unit} this exercise, ${fmtVolume(dayKg, unit)} ${unit} today`
      }
    >
      <View className="flex-1">
        <Text className="text-meta text-secondary">{mode === 'time' ? 'Time under tension' : repsOnly ? 'Total reps' : 'This exercise'}</Text>
        {mode === 'time' ? (
          <AnimatedNumber value={tutSeconds} format={formatDuration} className="text-metric text-label" />
        ) : repsOnly ? (
          <AnimatedNumber value={reps} className="text-metric text-label" />
        ) : (
          <AnimatedNumber value={Math.round(toDisplay(exerciseKg, unit))} format={withUnit} className="text-metric text-label" />
        )}
      </View>
      <View className="flex-1 items-end">
        <Text className="text-meta text-secondary">Today’s total</Text>
        <AnimatedNumber value={day} format={withUnit} className="text-metric text-label" />
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
  /** Show the full-screen rest countdown over the drawer. */
  restOpen: boolean;
  active: Exercise | null;
  rows: SetRow[];
  ghosts: Ghost[];
  prevSets: SetPerf[] | undefined;
  entries: HistoryEntry[] | undefined;
  /** "Last time · 3 days ago · 60 × 8 · 60 × 8", or null for a first-ever session */
  lastTime: string | null;
  unit: Unit;
  step: number;
  /** Reps or Time for the exercise currently selected. Ignored while nothing is picked. */
  mode: SetMode;
  onModeChange: (mode: SetMode) => void;
  onUnitChange: (unit: Unit) => void;
  /** "Next: Set 2 · 12 reps · 20 kg", shown under the rest countdown */
  nextUp: string;
  today: string;
  activeIndex: number;
  activeRow: SetRow | undefined;
  exerciseKg: number;
  tutSeconds: number;
  dayKg: number;
  onChange: (rowId: string, field: 'weight' | 'reps', value: number | null) => void;
  onLog: (rowId: string, weight: number, reps: number) => void;
  onAdd: () => void;
  onRemove: () => void;
  onApply: (sets: SetPerf[]) => void;
}

/**
 * The workout recorder drawer, top to bottom: search (with ✕) → last time and Reps/Time toggle →
 * form demo and cues → set rows and "Add set" → live volume (or time under tension) → rest timer, overload hint and
 * goal. The footer is pinned: the running rest countdown, the ± steppers for the active set, and
 * the Done button.
 */
export function WorkoutRecorderSheet(p: Props) {
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const anyLogged = p.rows.some((r) => r.done);
  const load = loadOf(p.active);

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
      {p.restOpen ? null : <RestStrip />}
      <LogDock
        compact
        activeRow={p.activeRow}
        activeIndex={p.activeIndex}
        ghost={p.activeIndex >= 0 ? p.ghosts[p.activeIndex] : undefined}
        unit={p.unit}
        step={p.step}
        mode={p.mode}
        load={load}
        onChange={p.onChange}
        onLog={p.onLog}
        onAdd={p.onAdd}
      />
      {hint ? (
        <Text className="px-4 pt-2 text-center text-meta" style={{ color: colors.warn }} accessibilityLiveRegion="polite">
          {hint}
        </Text>
      ) : null}
      <View className="px-4 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done"
          onPress={done}
          className="items-center justify-center bg-accent active:opacity-80"
          style={{ height: 52, borderRadius: 14 }}
        >
          <Text style={{ color: '#000', fontFamily: fonts.bold, fontSize: 18 }}>Done</Text>
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
        <>
          <SetDetailsSheet
            visible={detailsId != null}
            onClose={() => setDetailsId(null)}
            row={p.rows.find((r) => r.id === detailsId)}
            index={Math.max(0, p.rows.findIndex((r) => r.id === detailsId))}
          />
          {p.restOpen ? <RestOverlay nextUp={p.nextUp} /> : null}
        </>
      }
    >
      {p.search}

      {p.searching ? null : (
        <>
          {p.active ? (
            <>
              <Text className="text-meta text-secondary" accessibilityLabel={p.lastTime ?? `First time logging ${p.active.name}`}>
                {p.lastTime ?? `First time logging ${p.active.name}. Today’s sets become your baseline.`}
              </Text>
              <View className="flex-row items-center justify-end" style={{ gap: 8 }}>
                {load === 'none' ? null : <UnitToggle unit={p.unit} onChange={p.onUnitChange} />}
                <ModeToggle mode={p.mode} onChange={p.onModeChange} />
              </View>
              <ExerciseMedia exercise={p.active} />
              <SetTable
                rows={p.rows}
                prevSets={p.prevSets}
                unit={p.unit}
                mode={p.mode}
                load={load}
                activeRowId={p.activeRow?.id}
                onChange={p.onChange}
                onLog={p.onLog}
                onAdd={p.onAdd}
                onRemove={p.onRemove}
                onDetails={setDetailsId}
              />
              <WeekProgressCard entries={p.entries} today={p.today} unit={p.unit} mode={p.mode} />

              <VolumeReadout exerciseKg={p.exerciseKg} tutSeconds={p.tutSeconds} reps={exerciseReps(p.rows)} dayKg={p.dayKg} unit={p.unit} mode={p.mode} />
              <TimerDashboard />
              <ExerciseInsights exercise={p.active} entries={p.entries} rows={p.rows} today={p.today} unit={p.unit} mode={p.mode} step={p.step} onApply={p.onApply} />
              {/* Goals are a weight target, which doesn't apply to a timed hold or a no-weight move — the note field still does. */}
              <ExerciseGoalCard exercise={p.active} entries={p.entries} hideGoal={p.mode === 'time' || load !== 'kg'} />
            </>
          ) : (
            <View className="items-center px-6 py-6">
              <Text className="text-h2 text-label">Pick an exercise to start</Text>
              <Text className="mt-1 text-center text-body text-muted">Last time's sets show beside each row. Type the weight and reps, then tap the check.</Text>
            </View>
          )}
        </>
      )}

    </BottomDrawer>
  );
}

/** The running rest countdown, shown only while a timer is active. */
function RestStrip() {
  const { timer, controls } = useTimer();
  const running = timer.status === 'running';
  const now = useNow(running);
  if (timer.status === 'idle') return null;
  const seconds = timer.status === 'done' ? 0 : Math.ceil(remainingMs(timer, now) / 1000);
  return (
    <View className="px-4 pt-2">
      <View className="flex-row items-center" style={{ height: 44, paddingLeft: 12, gap: 10, borderRadius: 12, backgroundColor: colors.fill }}>
        <Text accessibilityRole="timer" accessibilityLabel={`${fmt(seconds)} remaining`} style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 14 }}>
          Rest <Text style={{ fontFamily: fonts.bold, fontVariant: ['tabular-nums'] }}>{fmt(seconds)}</Text>
        </Text>
        <View className="flex-1 overflow-hidden" style={{ height: 4, borderRadius: 2, backgroundColor: colors.outline }}>
          <View style={{ width: `${progressOf(timer, now) * 100}%`, height: 4, backgroundColor: colors.accent }} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Skip" onPress={controls.skip} className="justify-center active:opacity-60" style={{ height: 44, paddingHorizontal: 12 }}>
          <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 14 }}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}
