import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '../lib/haptics';
import { colors, motion } from '../theme';
import { SlidersIcon } from './Icons';

export type TabKey = 'attendance' | 'gym' | 'body';

export const TABS: { key: TabKey; label: string }[] = [
  { key: 'attendance', label: 'Attendance' },
  { key: 'gym', label: 'Gym Progress' },
  { key: 'body', label: 'BMI & Weight' },
];

const PAD = 4;
const BAR_HEIGHT = 44;

/**
 * Top-level navigation: a segmented control pinned under the status bar on every screen.
 * The highlight slides between tabs in 250ms.
 */
export function TopTabBar({ value, onChange, onSettings }: { value: TabKey; onChange: (tab: TabKey) => void; onSettings: () => void }) {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const index = TABS.findIndex((t) => t.key === value);
  const tabWidth = Math.max(0, (width - PAD * 2) / TABS.length);
  const x = useSharedValue(0);

  useEffect(() => {
    x.value = withTiming(index * tabWidth, motion);
  }, [index, tabWidth, x]);

  const highlight = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View className="flex-row items-center gap-2 bg-base px-4 pb-2" style={{ paddingTop: insets.top + 8 }}>
      <View
        accessibilityRole="tablist"
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        className="flex-1 flex-row rounded-full border border-line bg-surface"
        style={{ height: BAR_HEIGHT, padding: PAD, borderColor: colors.line }}
      >
        {width > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              { position: 'absolute', top: PAD, left: PAD, width: tabWidth, height: BAR_HEIGHT - PAD * 2 - 2, borderRadius: 999, backgroundColor: colors.outline },
              highlight,
            ]}
          />
        ) : null}

        {TABS.map((t) => {
          const selected = t.key === value;
          return (
            <Pressable
              key={t.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => {
                if (!selected) haptic.tap();
                onChange(t.key);
              }}
              className="flex-1 items-center justify-center"
            >
              <Text
                numberOfLines={1}
                className={selected ? 'text-label' : 'text-muted'}
                style={{ fontSize: 14, fontWeight: '600', letterSpacing: -0.2 }}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Settings"
        onPress={() => {
          haptic.tap();
          onSettings();
        }}
        className="h-11 w-11 items-center justify-center rounded-full border border-line bg-surface active:opacity-60"
        style={{ borderColor: colors.line }}
      >
        <SlidersIcon />
      </Pressable>
    </View>
  );
}
