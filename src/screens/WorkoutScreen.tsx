import { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseChips } from '../components/ExerciseChips';
import { ExerciseInsights } from '../components/ExerciseInsights';
import { ExerciseSearch } from '../components/ExerciseSearch';
import { Header } from '../components/Header';
import { LogDock } from '../components/LogDock';
import { RestBanner } from '../components/RestBanner';
import { SetTable } from '../components/SetTable';
import { TimerDashboard } from '../components/TimerDashboard';
import { WeeklyProgressCard } from '../components/WeeklyProgressCard';
import { ghostFor, previousEntry } from '../lib/progress';
import { useGym } from '../store/gym';
import { useTimer } from '../store/timer';
import { colors } from '../theme';

/**
 * Workout & weight-progress screen: exercise logger, progress tracker and rest timer.
 * Logs against `today` from the store: the real today, or whichever date the calendar routed here.
 */
export function WorkoutScreen() {
  const { active, rows, history, data, today, realToday, actions } = useGym();
  const { timer, settings, controls } = useTimer();
  const insets = useSafeAreaInsets();
  const [searchOpen, setSearchOpen] = useState(false);
  const [stackHeight, setStackHeight] = useState(0);

  const entries = active ? history[active.id] : undefined;
  const prevSets = useMemo(() => previousEntry(entries, today)?.sets, [entries, today]);
  const ghosts = useMemo(() => rows.map((_, i) => ghostFor(i, rows, prevSets)), [rows, prevSets]);

  const activeIndex = rows.findIndex((r) => !r.done);
  const activeRow = activeIndex >= 0 ? rows[activeIndex] : undefined;

  /** Every checkmark goes through here. Logging a set today starts the rest timer; back-filling a past day doesn't. */
  const logSet = useCallback(
    (rowId: string, weight: number, reps: number) => {
      const wasDone = rows.find((r) => r.id === rowId)?.done ?? false;
      actions.toggleSet(rowId, weight, reps);
      if (!wasDone && settings.autoStart && today === realToday) controls.start(settings.defaultSeconds);
    },
    [rows, actions, settings.autoStart, settings.defaultSeconds, controls, today, realToday],
  );

  const showDock = !!active && !searchOpen;
  const showBanner = timer.status !== 'idle';
  const showStack = showDock || showBanner;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-base">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: showStack ? stackHeight + 16 : insets.bottom + 32 }}
      >
        <Header />
        <ExerciseSearch open={searchOpen} onOpenChange={setSearchOpen} />

        {!searchOpen ? (
          <>
            <ExerciseChips />

            {active ? (
              <>
                <SetTable
                  rows={rows}
                  ghosts={ghosts}
                  prevSets={prevSets}
                  unit={data.unit}
                  activeRowId={activeRow?.id}
                  onChange={actions.setField}
                  onLog={logSet}
                  onAdd={actions.addSet}
                  onRemove={actions.removeSet}
                />
                <TimerDashboard />
                <ExerciseInsights exercise={active} entries={entries} rows={rows} today={today} unit={data.unit} onApply={actions.fillSets} />
              </>
            ) : (
              <>
                <View className="items-center px-6 py-8">
                  <Text className="text-h2 text-label">Pick an exercise to start</Text>
                  <Text className="mt-1 text-center text-body text-muted">
                    Your last weight and reps are filled in as grey suggestions. Tap a box to accept it, or just tap the check.
                  </Text>
                </View>
                <TimerDashboard />
              </>
            )}

            <WeeklyProgressCard />
          </>
        ) : null}
      </ScrollView>

      {/* Bottom stack: countdown banner above the log dock. Measured so the scroll view never hides behind it. */}
      {showStack ? (
        <View
          onLayout={(e) => setStackHeight(e.nativeEvent.layout.height)}
          className="absolute bottom-0 left-0 right-0 border-t border-line bg-base"
          style={{ borderTopColor: colors.line, paddingBottom: showDock ? 0 : Math.max(insets.bottom, 12) + 4 }}
        >
          {showBanner ? (
            <View className="px-4 pt-3">
              <RestBanner />
            </View>
          ) : null}
          {showDock ? (
            <LogDock
              activeRow={activeRow}
              activeIndex={activeIndex}
              ghost={activeIndex >= 0 ? ghosts[activeIndex] : undefined}
              unit={data.unit}
              step={data.unit === 'kg' ? data.prefs.stepKg : data.prefs.stepLb}
              onChange={actions.setField}
              onLog={logSet}
              onAdd={actions.addSet}
            />
          ) : null}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
