import { Text, View } from 'react-native';

import { CAPSULE_COLORS, CAPSULE_NEUTRAL, STATUS_META, type StatusMap } from '../../lib/attendance';
import { addDays, WEEKDAY_LETTERS, weekStartKey } from '../../lib/dates';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Monday to Sunday of this week, coloured by each day's attendance. */
export function WeekCapsules({ statuses, today }: { statuses: StatusMap; today: string }) {
  const start = weekStartKey(today);
  return (
    <View className="flex-row" style={{ gap: 8 }} accessibilityLabel="This week’s attendance">
      {WEEKDAY_LETTERS.map((letter, i) => {
        const status = statuses[addDays(start, i)];
        return (
          <View
            key={i}
            accessibilityLabel={`${WEEKDAYS[i]}: ${status ? STATUS_META[status].label : 'Not logged'}`}
            className="flex-1 items-center justify-center rounded-full border"
            style={{
              height: 56,
              backgroundColor: status ? CAPSULE_COLORS[status] : CAPSULE_NEUTRAL.background,
              borderColor: status ? CAPSULE_COLORS[status] : CAPSULE_NEUTRAL.border,
            }}
          >
            <Text className="text-meta font-bold" style={{ color: status ? '#000' : CAPSULE_NEUTRAL.text }}>
              {letter}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
