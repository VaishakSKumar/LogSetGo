import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { haptic } from '../../lib/haptics';
import { colors, motion } from '../../theme';
import type { SetMode } from '../../types';

const OPTIONS: { key: SetMode; label: string }[] = [
  { key: 'reps', label: 'Reps' },
  { key: 'time', label: 'Time' },
];

/**
 * Apple-style segmented control: an elevated #2C2C2E track with a sliding #30D158 pill behind
 * whichever segment is active. Changing it saves your choice for this exercise going forward.
 */
export function ModeToggle({ mode, onChange }: { mode: SetMode; onChange: (mode: SetMode) => void }) {
  const [trackWidth, setTrackWidth] = useState(0);
  const x = useSharedValue(0);
  const segmentWidth = trackWidth / OPTIONS.length;

  useEffect(() => {
    if (!trackWidth) return;
    const i = OPTIONS.findIndex((o) => o.key === mode);
    x.value = withTiming(i * segmentWidth, motion);
  }, [mode, trackWidth, segmentWidth, x]);

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      className="h-9 w-[132px] flex-row rounded-full p-1"
      style={{ backgroundColor: colors.fill }}
    >
      {trackWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', top: 4, bottom: 4, left: 4, width: segmentWidth - 4, borderRadius: 999, backgroundColor: colors.accent }, pill]}
        />
      ) : null}
      {OPTIONS.map((o) => (
        <Pressable
          key={o.key}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === o.key }}
          accessibilityLabel={`${o.label} mode`}
          onPress={() => {
            if (mode === o.key) return;
            haptic.tap();
            onChange(o.key);
          }}
          className="flex-1 items-center justify-center"
        >
          <Text className={`text-caption font-semibold ${mode === o.key ? 'text-black' : 'text-muted'}`}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
