import type { ComponentType } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '../lib/haptics';
import { colors, fonts } from '../theme';
import { CalendarCheckIcon, DumbbellIcon, PersonIcon } from './Icons';

export type TabKey = 'attendance' | 'gym' | 'account';

export const TABS: { key: TabKey; label: string; Icon: ComponentType<{ size?: number; color?: string; stroke?: number }> }[] = [
  { key: 'attendance', label: 'Attendance', Icon: CalendarCheckIcon },
  { key: 'gym', label: 'Gym Progress', Icon: DumbbellIcon },
  { key: 'account', label: 'Account', Icon: PersonIcon },
];

/** Top-level navigation: a floating pill. The open tab sits in a filled accent circle. */
export function BottomTabBar({ value, onChange }: { value: TabKey; onChange: (tab: TabKey) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="bg-base" style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 14 + insets.bottom }}>
      <View
        accessibilityRole="tablist"
        className="flex-row"
        style={{ height: 68, paddingHorizontal: 6, borderRadius: 34, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.raised, elevation: 10, shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 14, shadowOffset: { width: 0, height: 10 } }}
      >
        {TABS.map(({ key, label, Icon }) => {
          const selected = key === value;
          return (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => {
                if (!selected) haptic.tap();
                onChange(key);
              }}
              className="flex-1 items-center justify-center"
              style={{ gap: selected ? 1 : 3 }}
            >
              {selected ? (
                <View className="items-center justify-center" style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.accent }}>
                  <Icon size={20} color="#000" stroke={2.1} />
                </View>
              ) : (
                <Icon size={22} color={colors.secondary} stroke={1.9} />
              )}
              <Text numberOfLines={1} style={{ color: selected ? colors.accent : colors.secondary, fontFamily: selected ? fonts.bold : fonts.medium, fontSize: 12, lineHeight: 15 }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
