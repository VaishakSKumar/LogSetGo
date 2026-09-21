import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { haptic } from '../../lib/haptics';
import { goalProgress } from '../../lib/stats';
import { fmtWeight, fromDisplay, roundDisplay, toDisplay } from '../../lib/units';
import { useGym } from '../../store/gym';
import { colors } from '../../theme';
import type { Exercise } from '../../types';
import { Sheet, SheetBody } from '../Sheet';
import { Caption, PillButton } from '../ui';
import { NumField } from './NumField';

/** Set (or clear) "lift X kg" for one exercise, with a live preview of the path there. */
export function GoalSheet({ visible, onClose, exercise }: { visible: boolean; onClose: () => void; exercise: Exercise }) {
  const { data, history, realToday, actions } = useGym();
  const unit = data.unit;
  const step = unit === 'kg' ? data.prefs.stepKg : data.prefs.stepLb;
  const existing = data.goals[exercise.id];
  const entries = history[exercise.id];
  const bestNow = entries?.length ? Math.max(...entries.map((e) => Math.max(...e.sets.map((s) => s.weight)))) : 0;

  const [target, setTarget] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const start = existing ? existing.targetKg : bestNow > 0 ? bestNow + fromDisplay(step * 4, unit) : fromDisplay(unit === 'kg' ? 100 : 225, unit);
    setTarget(roundDisplay(toDisplay(start, unit)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const targetKg = fromDisplay(target, unit);
  const preview = target > 0 ? goalProgress({ targetKg, createdAt: realToday }, entries, fromDisplay(step, unit)) : null;

  const save = () => {
    if (target <= 0) return;
    actions.setGoal(exercise.id, { targetKg, createdAt: existing?.createdAt ?? realToday });
    haptic.pulse();
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={`Goal · ${exercise.name}`}>
      <SheetBody>
        <Caption className="mb-3">The heaviest weight you want to lift for this exercise.</Caption>
        <View className="flex-row">
          <NumField label={`Target (${unit})`} value={target} onChange={setTarget} step={step} min={0} max={1500} />
        </View>

        {preview ? (
          <View className="mt-4 rounded-2xl bg-fill/50 p-3">
            <View className="flex-row justify-between py-1">
              <Text className="text-body text-muted">Your heaviest so far</Text>
              <Text className="text-body tabular-nums text-label">{bestNow ? `${fmtWeight(bestNow, unit)} ${unit}` : 'nothing logged yet'}</Text>
            </View>
            <View className="flex-row justify-between py-1">
              <Text className="text-body text-muted">To go</Text>
              <Text className="text-body tabular-nums text-label">{preview.achieved ? 'Already there' : `${fmtWeight(preview.remainingKg, unit)} ${unit}`}</Text>
            </View>
            <View className="flex-row justify-between py-1">
              <Text className="text-body text-muted">At your pace</Text>
              <Text className="text-body tabular-nums" style={{ color: preview.etaWeeks ? colors.accent : colors.muted }}>
                {preview.achieved ? '—' : preview.etaWeeks ? `about ${preview.etaWeeks} week${preview.etaWeeks > 1 ? 's' : ''}` : 'log 3+ sessions to estimate'}
              </Text>
            </View>
            {preview.milestones.length ? (
              <Text className="mt-2 text-caption text-muted">Path: {preview.milestones.map((m) => `${fmtWeight(m, unit)}`).join(' → ')} {unit}</Text>
            ) : null}
          </View>
        ) : null}

        <View className="mt-4 gap-2">
          <PillButton variant="primary" label={existing ? 'Update goal' : 'Set goal'} disabled={target <= 0} onPress={save} />
          {existing ? (
            <PillButton
              label="Remove goal"
              onPress={() => {
                haptic.tap();
                actions.setGoal(exercise.id, null);
                onClose();
              }}
            />
          ) : null}
        </View>
      </SheetBody>
    </Sheet>
  );
}
