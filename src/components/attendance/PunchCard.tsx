import { Pressable, Text, View } from 'react-native';

import { STATUS_META, type Status } from '../../lib/attendance';
import { colors } from '../../theme';
import { FingerprintIcon } from '../Icons';

const COPY: Record<Status | 'none', { title: string; sub: string }> = {
  none: { title: 'Punch In', sub: 'Tap to choose how today goes' },
  present: { title: 'Start Workout', sub: 'You’re in for today' },
  absent: { title: 'Rest day', sub: `Marked ${STATUS_META.absent.label}. Tap to change.` },
  holiday: { title: 'Travel or holiday', sub: `Marked ${STATUS_META.holiday.label}. Tap to change.` },
};

/** The home screen's main action. It always opens the choice sheet, so nothing is marked by accident. */
export function PunchCard({ status, onPress }: { status: Status | undefined; onPress: () => void }) {
  const copy = COPY[status ?? 'none'];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${copy.title}. ${copy.sub}`}
      onPress={onPress}
      className="flex-row items-center gap-4 rounded-3xl border p-4 active:opacity-80"
      style={{ backgroundColor: colors.surface, borderColor: colors.accentBorder }}
    >
      <View className="h-16 w-16 items-center justify-center rounded-full bg-accent">
        <FingerprintIcon size={36} color="#000" />
      </View>
      <View className="flex-1">
        <Text className="text-h1 text-label">{copy.title}</Text>
        <Text className="text-meta text-muted">{copy.sub}</Text>
      </View>
    </Pressable>
  );
}
