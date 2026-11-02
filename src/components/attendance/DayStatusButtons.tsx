import { Pressable, Text, View } from 'react-native';

import { STATUS_META, STATUSES, isFuture, type Status } from '../../lib/attendance';
import { colors, fonts } from '../../theme';

interface Props {
  date: string;
  today: string;
  current: Status | undefined;
  /** `null` when the selected status is tapped again, which clears it. */
  onChange: (status: Status | null) => void;
}

/** Present / Absent / Holiday for one date. A future date can only be planned as a Holiday. */
export function DayStatusButtons({ date, today, current, onChange }: Props) {
  const future = isFuture(date, today);
  return (
    <View className="flex-row" style={{ gap: 6 }}>
      {STATUSES.map((s) => {
        const on = current === s;
        const locked = future && s !== 'holiday';
        const { label, color } = STATUS_META[s];
        return (
          <Pressable
            key={s}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: on, disabled: locked }}
            disabled={locked}
            onPress={() => onChange(on ? null : s)}
            className="flex-1 items-center justify-center active:opacity-70"
            style={{ height: 44, borderRadius: 12, backgroundColor: on ? color : colors.control }}
          >
            <Text style={{ color: on ? '#000' : locked ? colors.faint : colors.label, fontFamily: fonts.bold, fontSize: 14 }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
