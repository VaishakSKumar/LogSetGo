import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { haptic } from '../../lib/haptics';
import { colors, fonts, motion } from '../../theme';
import type { SetMode } from '../../types';

const OPTIONS: { key: SetMode; label: string }[] = [
  { key: 'reps', label: 'Reps' },
  { key: 'time', label: 'Time' },
];

/**
 * Segmented control: a dark track with a sliding white pill behind whichever segment is active. Changing it saves your choice for this exercise going forward.
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
      className="flex-row"
      style={{ width: 124, height: 44, padding: 3, borderRadius: 12, backgroundColor: colors.fill }}
    >
      {trackWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', top: 3, bottom: 3, left: 3, width: segmentWidth - 3, borderRadius: 9, backgroundColor: '#fff' }, pill]}
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
          <Text style={{ color: mode === o.key ? '#000' : colors.secondary, fontFamily: fonts.bold, fontSize: 14 }}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
