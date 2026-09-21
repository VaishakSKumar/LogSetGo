import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { haptic } from '../../lib/haptics';
import type { DaySummary } from '../../lib/session';
import { fmtVolume, toDisplay } from '../../lib/units';
import { colors, motion } from '../../theme';
import type { Unit } from '../../types';
import { ChevronDownIcon } from '../Icons';
import { AnimatedNumber } from './AnimatedNumber';

const Metric = ({ value, label, unit, a11y }: { value: number; label: string; unit?: string; a11y: string }) => (
  <View className="flex-1" accessible accessibilityLabel={a11y}>
    <View className="flex-row items-baseline gap-1">
      <AnimatedNumber value={value} className="text-metric text-label" />
      {unit ? <Text className="text-meta text-muted">{unit}</Text> : null}
    </View>
    <Text className="text-meta text-muted">{label}</Text>
  </View>
);

/**
 * Today's Workout: exercises, sets and total volume. Collapses to one line. Every figure counts to
 * its new value, so deleting an exercise visibly takes its volume off the total.
 */
export function SummaryCard({ summary, unit }: { summary: DaySummary; unit: Unit }) {
  const [collapsed, setCollapsed] = useState(false);
  const turn = useSharedValue(0);

  useEffect(() => {
    turn.value = withTiming(collapsed ? 1 : 0, motion);
  }, [collapsed, turn]);

  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * -90}deg` }] }));

  const volume = Math.round(toDisplay(summary.volume, unit));
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const oneLine = `${plural(summary.exercises, 'exercise')} · ${plural(summary.sets, 'set')} · ${fmtVolume(summary.volume, unit)} ${unit}`;

  return (
    <Animated.View
      layout={LinearTransition.duration(motion.duration)}
      style={{ backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 24, padding: 16 }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={collapsed ? "Show today's workout summary" : "Hide today's workout summary"}
        accessibilityState={{ expanded: !collapsed }}
        onPress={() => {
          haptic.tap();
          setCollapsed((c) => !c);
        }}
        className="flex-row items-center justify-between active:opacity-70"
      >
        <View className="flex-1 pr-3">
          <Text className="text-h2 text-label">Today’s workout</Text>
          {collapsed ? (
            <Text className="mt-0.5 text-meta text-muted" accessibilityLabel={`Summary: ${oneLine}`}>
              {oneLine}
            </Text>
          ) : null}
        </View>
        <Animated.View style={chevron}>
          <ChevronDownIcon />
        </Animated.View>
      </Pressable>

      {!collapsed ? (
        <Animated.View entering={FadeIn.duration(motion.duration)} style={{ marginTop: 12, flexDirection: 'row', gap: 16 }}>
          <Metric value={summary.exercises} label={summary.exercises === 1 ? 'Exercise' : 'Exercises'} a11y={plural(summary.exercises, 'exercise')} />
          <Metric value={summary.sets} label={summary.sets === 1 ? 'Set' : 'Sets'} a11y={plural(summary.sets, 'set')} />
          <Metric value={volume} unit={unit} label="Total volume" a11y={`Total volume ${fmtVolume(summary.volume, unit)} ${unit}`} />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}
