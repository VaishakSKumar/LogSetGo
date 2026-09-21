import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { COUNT_HOLIDAYS_IN_RATE, type AttendanceStats } from '../../lib/attendance';
import { colors, motion, roundedFont } from '../../theme';
import { Caption, Card } from '../ui';

function Stat({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <View className="flex-1">
      <Text
        className="tabular-nums text-label"
        style={{ fontFamily: roundedFont, fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.5 }}
        accessibilityLabel={`${label}: ${value}`}
      >
        {value}
      </Text>
      <Text className="text-body text-label">{label}</Text>
      {sub ? <Caption>{sub}</Caption> : null}
    </View>
  );
}

/** Showed up · streak · attendance rate. Recomputes the instant any date changes. */
export function AnalyticsCard({ stats }: { stats: AttendanceStats }) {
  const [width, setWidth] = useState(0);
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = withTiming((stats.rate ?? 0) / 100, motion);
  }, [stats.rate, fill]);

  const bar = useAnimatedStyle(() => ({ width: fill.value * width }));

  return (
    <Card className="p-4">
      <View className="flex-row">
        <Stat value={String(stats.present)} label="Showed up" sub={stats.present === 1 ? 'day' : 'days'} />
        <Stat value={String(stats.streak)} label="Streak" sub={stats.streak === 1 ? 'day in a row' : 'days in a row'} />
        <Stat value={stats.rate === null ? '—' : `${stats.rate}%`} label="Attendance" sub={`${stats.present} of ${stats.logged} days`} />
      </View>

      <View
        className="mt-4 h-2 overflow-hidden rounded-full bg-fill"
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessibilityLabel={`Attendance rate ${stats.rate ?? 0} percent`}
      >
        <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: colors.accent }, bar]} />
      </View>
      <Caption className="mt-2">{COUNT_HOLIDAYS_IN_RATE ? 'Rate counts every logged day.' : 'Rate = present ÷ (present + absent). Holidays are excused.'}</Caption>
    </Card>
  );
}
