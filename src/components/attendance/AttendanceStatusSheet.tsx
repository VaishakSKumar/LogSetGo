import { Pressable, Text, View } from 'react-native';

import type { Status } from '../../lib/attendance';
import { colors } from '../../theme';
import { Sheet } from '../Sheet';

const OPTIONS: { status: Status; label: string }[] = [
  { status: 'present', label: '🟢 Start Workout' },
  { status: 'absent', label: '🔴 Mark Rest/Absent Day' },
  { status: 'holiday', label: '🟡 Mark Travel/Holiday' },
];

interface Props {
  visible: boolean;
  onSelect: (status: Status) => void;
  onClose: () => void;
}

/** What the Punch In card opens: today's three choices. */
export function AttendanceStatusSheet({ visible, onSelect, onClose }: Props) {
  return (
    <Sheet visible={visible} onClose={onClose} title="How’s today?">
      <View className="gap-2 px-4 pb-2">
        {OPTIONS.map(({ status, label }) => (
          <Pressable
            key={status}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => onSelect(status)}
            className="h-14 justify-center rounded-[14px] border bg-raised px-4 active:opacity-70"
            style={{ borderColor: colors.border }}
          >
            <Text className="text-h2 text-label">{label}</Text>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}
