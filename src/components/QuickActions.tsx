import { Pressable, Text, View } from 'react-native';

import { haptic } from '../lib/haptics';
import { colors, fonts } from '../theme';

export type QuickSheet = 'routines' | 'stats' | 'tools' | 'summary';

const ACTIONS: { key: QuickSheet; label: string }[] = [
  { key: 'routines', label: 'Routines' },
  { key: 'stats', label: 'Stats' },
  { key: 'tools', label: 'Tools' },
  { key: 'summary', label: 'Summary' },
];

/** One row of shortcuts. */
export function QuickActions({ onOpen }: { onOpen: (which: QuickSheet) => void }) {
  return (
    <View className="flex-row" style={{ gap: 6 }}>
      {ACTIONS.map((a) => (
        <Pressable
          key={a.key}
          accessibilityRole="button"
          accessibilityLabel={a.label}
          onPress={() => {
            haptic.tap();
            onOpen(a.key);
          }}
          className="h-11 flex-1 items-center justify-center active:opacity-60"
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.panel }}
        >
          <Text style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 14 }} numberOfLines={1}>
            {a.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
