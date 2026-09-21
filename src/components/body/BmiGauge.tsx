import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { BMI_CATEGORIES, GAUGE_GAP, categoryOf, gaugeSegments, markerX } from '../../lib/body';
import { colors, motion } from '../../theme';

const BAR = 10;
const MARKER = 20;
/** Tick labels sit on the segment boundaries. */
const TICKS = [
  { label: '18.5', edge: 1 },
  { label: '25', edge: 2 },
  { label: '30', edge: 3 },
];

/**
 * Health-style range bar: four proportional segments, the one you're in at full color and the
 * rest dimmed, with a marker that glides to your exact BMI.
 */
export function BmiGauge({ bmi }: { bmi: number | null }) {
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const segments = useMemo(() => gaugeSegments(width), [width]);
  const current = bmi == null ? null : categoryOf(bmi);

  useEffect(() => {
    if (width > 0 && bmi != null) x.value = withTiming(markerX(bmi, width), motion);
  }, [bmi, width, x]);

  const marker = useAnimatedStyle(() => ({ transform: [{ translateX: x.value - MARKER / 2 }] }));

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: MARKER + 20 }}
      accessibilityRole="progressbar"
      accessibilityLabel={bmi == null ? 'BMI range scale' : `BMI ${bmi.toFixed(1)}, ${current}`}
    >
      {width > 0 ? (
        <>
          {segments.map((s) => (
            <View
              key={s.key}
              style={{
                position: 'absolute',
                left: s.x,
                top: (MARKER - BAR) / 2,
                width: s.w,
                height: BAR,
                borderRadius: BAR / 2,
                backgroundColor: s.color,
                opacity: current === s.key ? 1 : 0.28,
              }}
            />
          ))}

          {bmi != null ? (
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: MARKER,
                  height: MARKER,
                  borderRadius: MARKER / 2,
                  backgroundColor: colors.label,
                  borderWidth: 4,
                  borderColor: colors.surface,
                },
                marker,
              ]}
            />
          ) : null}

          {TICKS.map((t) => (
            <Text
              key={t.label}
              className="text-caption tabular-nums text-muted/70"
              style={{ position: 'absolute', top: MARKER + 4, width: 40, left: segments[t.edge].x - GAUGE_GAP / 2 - 20, textAlign: 'center', fontSize: 11 }}
            >
              {t.label}
            </Text>
          ))}
        </>
      ) : null}
    </View>
  );
}

/** Small pill naming the category, in that category's color. */
export function CategoryChip({ bmi }: { bmi: number }) {
  const meta = BMI_CATEGORIES.find((c) => c.key === categoryOf(bmi))!;
  return (
    <View className="rounded-full px-3 py-1" style={{ backgroundColor: `${meta.color}24` }}>
      <Text className="text-body font-semibold" style={{ color: meta.color }}>
        {meta.label}
      </Text>
    </View>
  );
}
