import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { addDays, weekRange, weekStartKey, weekdayIndex } from '../lib/dates';
import { WEEKLY_GOAL, weekTotals } from '../lib/progress';
import { fmtVolume } from '../lib/units';
import { useGym } from '../store/gym';
import { colors, motion } from '../theme';
import { ArrowUpIcon } from './Icons';
import { Caption, Card, Num } from './ui';

function Bar({ ratio, ahead }: { ratio: number; ahead: boolean }) {
  const [width, setWidth] = useState(0);
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = withTiming(Math.min(Math.max(ratio, 0), 1), motion);
  }, [ratio, fill]);

  const style = useAnimatedStyle(() => ({ width: fill.value * width }));

  return (
    <View className="h-2 overflow-hidden rounded-full bg-fill" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: ahead ? colors.accent : colors.label }, style]} />
    </View>
  );
}

/** Compact weekly rollup: volume vs last week, updates instantly as sets are logged. */
export function WeeklyProgressCard() {
  const { data, today } = useGym();
  const start = weekStartKey(today);
  const idx = weekdayIndex(today);

  const { cur, lastFull, lastToDate } = useMemo(
    () => ({
      cur: weekTotals(data.sessions, start),
      lastFull: weekTotals(data.sessions, addDays(start, -7)),
      lastToDate: weekTotals(data.sessions, addDays(start, -7), idx),
    }),
    [data.sessions, start, idx],
  );

  const hasLast = lastToDate.volume > 0;
  const pct = hasLast ? Math.round(((cur.volume - lastToDate.volume) / lastToDate.volume) * 100) : 0;
  const ahead = hasLast && cur.volume >= lastToDate.volume && cur.volume > 0;
  const ratio = lastFull.volume > 0 ? cur.volume / lastFull.volume : cur.volume > 0 ? 1 : 0;
  const unit = data.unit;

  return (
    <Card>
      <View className="mb-3 flex-row items-center justify-between px-1">
        <Text className="text-h2 text-label">This week</Text>
        <Caption>{weekRange(start)}</Caption>
      </View>

      <View className="mb-3 flex-row items-end justify-between px-1">
        <View>
          <Caption>Total volume</Caption>
          <View className="flex-row items-baseline gap-1">
            <Text className="text-h1 tabular-nums text-label">{fmtVolume(cur.volume, unit)}</Text>
            <Text className="text-body text-muted">{unit}</Text>
          </View>
        </View>

        {hasLast ? (
          <View className="items-end">
            <View className="flex-row items-center gap-1 rounded-full px-3 py-1" style={{ backgroundColor: ahead ? 'rgba(48,209,88,0.14)' : colors.fill }}>
              {ahead ? <ArrowUpIcon /> : null}
              <Text className="text-body font-semibold tabular-nums" style={{ color: ahead ? colors.accent : colors.muted }}>
                {cur.volume === 0 ? '0%' : `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct)}%`}
              </Text>
            </View>
            <Caption className="mt-1">vs same days last week</Caption>
          </View>
        ) : (
          <Caption>No data from last week yet</Caption>
        )}
      </View>

      <View className="px-1">
        <Bar ratio={ratio} ahead={ahead} />
        <Caption className="mt-1.5">
          {lastFull.volume > 0
            ? `${Math.round(ratio * 100)}% of last week’s ${fmtVolume(lastFull.volume, unit)} ${unit}`
            : 'Log a full week to set your baseline'}
        </Caption>
      </View>

      <View className="mt-3 flex-row border-t border-line px-1 pt-3" style={{ borderTopColor: colors.line }}>
        <View className="flex-1">
          <Caption>Sets</Caption>
          <View className="flex-row items-baseline gap-1">
            <Num size="text-h2">{cur.sets}</Num>
            {lastFull.sets > 0 ? <Caption>of {lastFull.sets} last wk</Caption> : null}
          </View>
        </View>
        <View className="flex-1">
          <Caption>Workouts</Caption>
          <View className="flex-row items-baseline gap-1">
            <Num size="text-h2">{cur.workouts}</Num>
            <Caption>of {WEEKLY_GOAL} goal</Caption>
          </View>
        </View>
      </View>
    </Card>
  );
}
