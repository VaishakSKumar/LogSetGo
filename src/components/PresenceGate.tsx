import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { STATUS_META, canLog } from '../lib/attendance';
import { longDate } from '../lib/calendar';
import { useAttendance } from '../store/attendance';
import { useGym } from '../store/gym';
import { colors } from '../theme';
import { PillButton } from './ui';

/**
 * Gym Progress is for days you showed up. Until the working date is Present the logger stays closed
 * and this explains why, with a route to the calendar. Logged history is never hidden by this:
 * a day with logged sets already counts as Present.
 */
export function PresenceGate({ onOpenAttendance, children }: { onOpenAttendance: () => void; children: ReactNode }) {
  const { today, realToday } = useGym();
  const { statuses } = useAttendance();

  if (canLog(statuses, today)) return <>{children}</>;

  const status = statuses[today];
  const isToday = today === realToday;
  const reason = status
    ? `${isToday ? 'Today' : longDate(today)} is marked ${STATUS_META[status].label}.`
    : `${isToday ? 'Today' : longDate(today)} isn't marked yet.`;

  return (
    <View className="flex-1 items-center justify-center bg-base px-8" accessibilityLabel="Gym Progress is locked">
      <View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: colors.fill }}>
        <Text className="text-h1 text-muted" accessibilityElementsHidden>
          P
        </Text>
      </View>
      <Text className="mt-5 text-center text-h1 text-label">Mark Present to start</Text>
      <Text className="mt-2 text-center text-body text-muted">{reason}</Text>
      <Text className="mt-1 text-center text-body text-muted">
        Open Attendance, tap the date and choose Present. Your workout opens right after.
      </Text>
      <PillButton label="Open Attendance" variant="primary" onPress={onOpenAttendance} className="mt-6 self-stretch" />
    </View>
  );
}
