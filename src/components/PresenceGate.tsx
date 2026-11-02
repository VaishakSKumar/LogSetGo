import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { canLog, type Status } from '../lib/attendance';
import { useDayStep } from '../lib/useDayStep';
import { useAttendance } from '../store/attendance';
import { useGym } from '../store/gym';
import { colors, fonts } from '../theme';
import { Header } from './Header';
import { CrossIcon, FingerprintIcon, SunIcon } from './Icons';

const COPY: Record<Exclude<Status, 'present'> | 'unmarked', { title: string; message: string; detail: string; action: string }> = {
  absent: {
    title: 'Marked\nAbsent',
    message: 'No workout to log today.',
    detail: 'Made it to the gym after all? Change today’s status to start logging.',
    action: 'Change today’s status',
  },
  holiday: {
    title: 'Holiday.\nRest up.',
    message: 'Today is a planned rest day.',
    detail: 'Your streak is safe. Training anyway? Change today’s status to start logging.',
    action: 'Change today’s status',
  },
  unmarked: {
    title: 'Punch in\nfirst.',
    message: 'Gym Progress opens after you punch in.',
    detail: 'Mark today as Present on the Attendance tab to start logging.',
    action: 'Go to Punch In',
  },
};

/**
 * Logging today requires showing up: until today is marked Present, the logger stays closed and
 * this explains why, with a route back to Attendance. Browsing any other date — past or future — is
 * always allowed; it's read-only history or an empty placeholder there, never a place to log
 * without having shown up, so the gate doesn't apply. A day with logged sets already counts as
 * Present, so revisiting it never hits this screen.
 */
export function PresenceGate({ onOpenAttendance, children }: { onOpenAttendance: () => void; children: ReactNode }) {
  const { today, realToday } = useGym();
  const { statuses } = useAttendance();
  const insets = useSafeAreaInsets();
  const swipe = useDayStep();

  if (today !== realToday) return <>{children}</>;
  if (canLog(statuses, today)) return <>{children}</>;

  const status = statuses[today];
  const key = status === 'absent' || status === 'holiday' ? status : 'unmarked';
  const copy = COPY[key];
  const open = key === 'unmarked';
  const page = key === 'absent' ? colors.danger : colors.holiday;
  const ink = open ? '#fff' : '#000';

  return (
    <View
      {...swipe}
      accessibilityLabel="Gym Progress is locked"
      className="flex-1"
      style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: open ? colors.base : page }}
    >
      <Header ink={ink} locked />
      <View className="flex-1 justify-center">
        <View
          className="items-center justify-center"
          style={{ width: 64, height: 64, borderRadius: key === 'holiday' ? 18 : 32, backgroundColor: open ? colors.accent : '#000' }}
        >
          {key === 'absent' ? <CrossIcon size={32} color={page} /> : key === 'holiday' ? <SunIcon size={34} color={page} /> : <FingerprintIcon size={36} color="#000" />}
        </View>
        <Text style={{ marginTop: 20, marginBottom: 12, color: open ? colors.accent : '#000', fontFamily: fonts.display, fontSize: 68, lineHeight: 66, textTransform: 'uppercase' }}>{copy.title}</Text>
        <Text style={{ color: open ? '#E5E5EA' : '#000', fontFamily: fonts.semibold, fontSize: 18, lineHeight: 26 }}>{copy.message}</Text>
        <Text style={{ marginTop: 8, color: open ? colors.secondary : '#000', fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 }}>{copy.detail}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.action}
        onPress={onOpenAttendance}
        className="items-center justify-center active:opacity-80"
        style={{ height: 56, borderRadius: 14, backgroundColor: open ? colors.accent : '#000' }}
      >
        <Text style={{ color: open ? '#000' : '#fff', fontFamily: fonts.bold, fontSize: 17 }}>{copy.action}</Text>
      </Pressable>
    </View>
  );
}
