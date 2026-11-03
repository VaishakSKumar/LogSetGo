import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { haptic } from '../../lib/haptics';
import { colors, fonts, motion } from '../../theme';
import type { SetMode, Unit } from '../../types';

/**
 * Segmented control: a dark track with a sliding white pill behind whichever segment is active.
 */
function Segmented<T extends string>({ value, options, describe, onChange }: { value: T; options: { key: T; label: string }[]; describe: (label: string) => string; onChange: (value: T) => void }) {
  const [trackWidth, setTrackWidth] = useState(0);
  const x = useSharedValue(0);
  const segmentWidth = trackWidth / options.length;

  useEffect(() => {
    if (!trackWidth) return;
    const i = options.findIndex((o) => o.key === value);
    x.value = withTiming(i * segmentWidth, motion);
  }, [value, options, trackWidth, segmentWidth, x]);

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      className="flex-row"
      style={{ width: 124, height: 44, padding: 3, borderRadius: 12, backgroundColor: colors.fill }}
    >
      {trackWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', top: 3, bottom: 3, left: 3, width: segmentWidth - 3, borderRadius: 9, backgroundColor: '#fff' }, pill]}
        />
      ) : null}
      {options.map((o) => (
        <Pressable
          key={o.key}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === o.key }}
          accessibilityLabel={describe(o.label)}
          onPress={() => {
            if (value === o.key) return;
            haptic.tap();
            onChange(o.key);
          }}
          className="flex-1 items-center justify-center"
        >
          <Text style={{ color: value === o.key ? '#000' : colors.secondary, fontFamily: fonts.bold, fontSize: 14 }}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const MODES: { key: SetMode; label: string }[] = [
  { key: 'reps', label: 'Reps' },
  { key: 'time', label: 'Time' },
];

const UNITS: { key: Unit; label: string }[] = [
  { key: 'kg', label: 'kg' },
  { key: 'lb', label: 'lbs' },
];

/** Reps or Time. Changing it saves your choice for this exercise going forward. */
export function ModeToggle({ mode, onChange }: { mode: SetMode; onChange: (mode: SetMode) => void }) {
  return <Segmented value={mode} options={MODES} describe={(label) => `${label} mode`} onChange={onChange} />;
}

/** kg or lbs, for gyms that label their plates differently. Saved weights stay the same; only how they read changes. */
export function UnitToggle({ unit, onChange }: { unit: Unit; onChange: (unit: Unit) => void }) {
  return <Segmented value={unit} options={UNITS} describe={(label) => `Weights in ${label}`} onChange={onChange} />;
}
