import { Pressable, Text, View } from 'react-native';

import { haptic } from '../lib/haptics';

export type QuickSheet = 'routines' | 'stats' | 'tools' | 'summary';

const ACTIONS: { key: QuickSheet; label: string }[] = [
  { key: 'routines', label: 'Routines' },
  { key: 'stats', label: 'Stats' },
  { key: 'tools', label: 'Tools' },
  { key: 'summary', label: 'Summary' },
];

/** One row of shortcuts under the exercise chips. */
export function QuickActions({ onOpen }: { onOpen: (which: QuickSheet) => void }) {
  return (
    <View className="flex-row gap-2">
      {ACTIONS.map((a) => (
        <Pressable
          key={a.key}
          accessibilityRole="button"
          accessibilityLabel={a.label}
          onPress={() => {
            haptic.tap();
            onOpen(a.key);
          }}
          className="h-11 flex-1 items-center justify-center rounded-full border border-line bg-surface active:opacity-60"
        >
          <Text className="text-body font-medium text-label" numberOfLines={1}>
            {a.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
