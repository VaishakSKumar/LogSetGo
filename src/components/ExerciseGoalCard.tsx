import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { goalProgress } from '../lib/stats';
import { fmtWeight, fromDisplay } from '../lib/units';
import { useGym } from '../store/gym';
import { colors } from '../theme';
import type { Exercise, HistoryEntry } from '../types';
import { GoalSheet } from './sheets/GoalSheet';
import { Caption, Card, PillButton } from './ui';

/**
 * Goal progress with a pace estimate, plus a free-text note for this exercise today.
 * `hideGoal` drops the weight-target section (used for time-based exercises, where a kg goal
 * doesn't apply) and keeps just the note field.
 */
export function ExerciseGoalCard({ exercise, entries, hideGoal }: { exercise: Exercise; entries: HistoryEntry[] | undefined; hideGoal?: boolean }) {
  const { data, today, actions } = useGym();
  const unit = data.unit;
  const goal = data.goals[exercise.id];
  const [open, setOpen] = useState(false);
  const saved = data.sessions[today]?.notes?.[exercise.id] ?? '';
  const [note, setNote] = useState(saved);
  // Switching exercise or day loads that note.
  useEffect(() => setNote(saved), [saved, exercise.id, today]);

  const step = fromDisplay(unit === 'kg' ? data.prefs.stepKg : data.prefs.stepLb, unit);
  const p = goal ? goalProgress(goal, entries, step) : null;

  return (
    <Card>
      {hideGoal ? null : (
        <>
          <View className="mb-2 flex-row items-center justify-between px-1">
            <Text className="text-h2 text-label">Goal</Text>
            <PillButton compact label={goal ? 'Edit' : 'Set a goal'} onPress={() => setOpen(true)} />
          </View>

          {goal && p ? (
            <View className="px-1">
              <View className="mb-1 flex-row items-baseline justify-between">
                <Text className="text-body tabular-nums text-label">
                  {fmtWeight(p.bestKg, unit)} / {fmtWeight(goal.targetKg, unit)} {unit}
                </Text>
                <Text className="text-body font-semibold tabular-nums" style={{ color: p.achieved ? colors.accent : colors.label }}>
                  {p.achieved ? 'Goal reached' : `${p.pct}%`}
                </Text>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.fill }} accessibilityRole="progressbar" accessibilityLabel={`Goal progress ${p.pct} percent`}>
                <View style={{ height: 6, borderRadius: 3, width: `${Math.max(2, p.pct)}%`, backgroundColor: p.achieved ? colors.accent : colors.label }} />
              </View>
              <Caption className="mt-1.5">
                {p.achieved
                  ? 'You lifted it. Set a new target to keep climbing.'
                  : p.etaWeeks
                    ? `About ${p.etaWeeks} week${p.etaWeeks > 1 ? 's' : ''} at your current pace. Next stop ${fmtWeight(p.milestones[0], unit)} ${unit}.`
                    : `${fmtWeight(p.remainingKg, unit)} ${unit} to go. Log 3+ sessions over a week for a pace estimate.`}
              </Caption>
            </View>
          ) : (
            <Caption className="px-1">Pick a target weight and we’ll track your progress and estimate when you’ll hit it.</Caption>
          )}
        </>
      )}

      <View className={hideGoal ? 'px-1' : 'mt-3 px-1'}>
        <Caption className="mb-1">Notes for today</Caption>
        <TextInput
          value={note}
          onChangeText={setNote}
          onBlur={() => actions.setExerciseNote(exercise.id, note)}
          placeholder="e.g. shoulder tight, used straps"
          placeholderTextColor={colors.ghost}
          maxLength={200}
          returnKeyType="done"
          accessibilityLabel="Exercise notes"
          className="h-11 rounded-xl bg-fill px-3 text-body text-label"
          style={{ outlineStyle: 'none' } as never}
        />
      </View>

      <GoalSheet visible={open} onClose={() => setOpen(false)} exercise={exercise} />
    </Card>
  );
}
