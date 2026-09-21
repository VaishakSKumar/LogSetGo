import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { bmiOf, categoryMeta, categoryOf, deltaTone, fmtTime } from '../../lib/body';
import { shortDate } from '../../lib/dates';
import { haptic } from '../../lib/haptics';
import { fmtDelta, fmtWeight, toDisplay } from '../../lib/units';
import { useBody } from '../../store/body';
import { useGym } from '../../store/gym';
import { colors } from '../../theme';
import { CloseIcon } from '../Icons';
import { Caption, Card, Num, PillButton } from '../ui';
import { toneColor } from './HeroCard';

const PAGE = 10;

/** Newest first: date and time, weight with its change, and the BMI that weight gave. */
export function WeightHistory() {
  const { entries, data, actions } = useBody();
  const { data: gym } = useGym();
  const unit = gym.unit;
  const [editing, setEditing] = useState(false);
  const [count, setCount] = useState(PAGE);

  return (
    <Card>
      <View className="mb-1 flex-row items-center justify-between px-1">
        <Text className="text-h2 text-label">History</Text>
        {entries.length ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setEditing((e) => !e)}
            className="h-11 justify-center px-2 active:opacity-60"
          >
            <Text className="text-body text-label">{editing ? 'Done' : 'Edit'}</Text>
          </Pressable>
        ) : null}
      </View>

      {entries.length === 0 ? (
        <Caption className="px-1 pb-2">Your weight log will appear here.</Caption>
      ) : (
        <>
          <View className="mb-1 flex-row px-1">
            <Caption className="flex-1">DATE</Caption>
            <Caption className="w-24 text-right">WEIGHT</Caption>
            <Caption className="w-16 text-right">BMI</Caption>
            {editing ? <View className="w-11" /> : null}
          </View>

          {entries.slice(0, count).map((e, i) => {
            const bmi = data.heightCm ? bmiOf(e.kg, data.heightCm) : null;
            const meta = bmi == null ? null : categoryMeta(categoryOf(bmi));
            const flat = e.delta != null && Math.abs(toDisplay(e.delta, unit)) < 0.05;
            return (
              <View
                key={e.id}
                className="min-h-[64px] flex-row items-center px-1"
                style={i ? { borderTopWidth: 1, borderTopColor: colors.line } : undefined}
              >
                <View className="flex-1 pr-2">
                  <Text className="text-body text-label">{shortDate(e.date)}</Text>
                  <Caption>{fmtTime(e.at)}</Caption>
                </View>

                <View className="w-24 items-end">
                  <Num size="text-h2">{fmtWeight(e.kg, unit)}</Num>
                  <Text
                    className="text-caption font-semibold tabular-nums"
                    style={{ color: e.delta == null || flat ? colors.muted : toneColor(deltaTone(e.prevKg!, e.kg, data.heightCm)) }}
                  >
                    {e.delta == null ? 'first' : flat ? 'same' : fmtDelta(e.delta, unit)}
                  </Text>
                </View>

                <View className="w-16 flex-row items-center justify-end gap-1.5">
                  {meta ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: meta.color }} /> : null}
                  <Text className="text-body tabular-nums text-label">{bmi == null ? '—' : bmi.toFixed(1)}</Text>
                </View>

                {editing ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete entry from ${shortDate(e.date)}`}
                    onPress={() => {
                      haptic.tap();
                      actions.deleteEntry(e.id);
                    }}
                    className="h-11 w-11 items-center justify-center active:opacity-60"
                  >
                    <CloseIcon size={16} color={colors.danger} />
                  </Pressable>
                ) : null}
              </View>
            );
          })}

          {entries.length > count ? (
            <View className="mt-2">
              <PillButton compact label={`Show ${Math.min(PAGE, entries.length - count)} more`} onPress={() => setCount((c) => c + PAGE)} />
            </View>
          ) : null}
        </>
      )}
    </Card>
  );
}
