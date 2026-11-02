import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { dayMonthShort } from '../../lib/calendar';
import { addDays } from '../../lib/dates';
import { haptic } from '../../lib/haptics';
import { clockTime, defaultLeave, leaveBounds, spentTime, stepLeave, type Visit } from '../../lib/visits';
import { colors, fonts } from '../../theme';
import { MinusIcon, PlusIcon } from '../Icons';
import { Sheet } from '../Sheet';

function Step({ label, disabled, onPress, children }: { label: string; disabled: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className="items-center justify-center active:opacity-60"
      style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: colors.fill }}
    >
      {children}
    </Pressable>
  );
}

/** Asks roughly when you left a day with no punch-out. Only the two buttons close it, one day at a time. */
export function MissedPunchOutSheet({ date, visit, today, onSave, onSkip }: { date: string; visit: Visit; today: string; onSave: (at: number) => void; onSkip: () => void }) {
  const [at, setAt] = useState(defaultLeave(visit.in));
  useEffect(() => setAt(defaultLeave(visit.in)), [visit.in]);

  const { min, max } = leaveBounds(visit.in);
  const day = date === addDays(today, -1) ? 'Yesterday' : `On ${dayMonthShort(date)}`;
  const nudge = (steps: number) => {
    haptic.tap();
    setAt((t) => stepLeave(visit.in, t, steps));
  };

  return (
    <Sheet visible title="You didn’t punch out" display onClose={() => {}}>
      <View style={{ paddingHorizontal: 16 }}>
        <Text style={{ color: colors.secondary, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 }}>
          {day} you punched in at {clockTime(visit.in)}. Roughly what time did you leave?
        </Text>
        <View className="flex-row items-center justify-between" style={{ marginTop: 16, gap: 8 }}>
          <Step label="15 minutes earlier" disabled={at <= min} onPress={() => nudge(-1)}>
            <MinusIcon size={22} color={at <= min ? colors.muted : '#fff'} />
          </Step>
          <Text accessibilityLiveRegion="polite" className="flex-1 text-center" numberOfLines={1} adjustsFontSizeToFit style={{ color: '#fff', fontFamily: fonts.display, fontSize: 60, lineHeight: 64, fontVariant: ['tabular-nums'] }}>
            {clockTime(at)}
          </Text>
          <Step label="15 minutes later" disabled={at >= max} onPress={() => nudge(1)}>
            <PlusIcon size={22} color={at >= max ? colors.muted : '#fff'} />
          </Step>
        </View>
        <Text className="text-center" style={{ marginTop: 4, color: colors.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>
          About {spentTime(visit.in, at)} in the gym
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save time"
          onPress={() => onSave(at)}
          className="items-center justify-center active:opacity-80"
          style={{ height: 52, marginTop: 16, borderRadius: 14, backgroundColor: colors.accent }}
        >
          <Text style={{ color: '#000', fontFamily: fonts.bold, fontSize: 16 }}>Save time</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onSkip} className="items-center justify-center active:opacity-60" style={{ height: 44, marginTop: 4 }}>
          <Text style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 14, textDecorationLine: 'underline' }}>I don’t remember</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}
