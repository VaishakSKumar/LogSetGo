import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { AttendanceStatusSheet } from '../components/attendance/AttendanceStatusSheet';
import { CalendarSheet } from '../components/attendance/CalendarSheet';
import { MissedPunchOutSheet } from '../components/attendance/MissedPunchOutSheet';
import { CalendarIcon, CheckIcon, ChevronRightIcon, CrossIcon, FingerprintIcon, SlidersIcon, SunIcon } from '../components/Icons';
import { CAPSULE_COLORS, STATUS_META, type Status } from '../lib/attendance';
import { dayMonthLong, dayMonthShort, weekdayLong } from '../lib/calendar';
import { addDays, weekStartKey } from '../lib/dates';
import { haptic } from '../lib/haptics';
import { clockTime, spentTime } from '../lib/visits';
import { useAttendance } from '../store/attendance';
import { useGym } from '../store/gym';
import { useNow, useTimer } from '../store/timer';
import { colors, fonts } from '../theme';

/** Room for the docked rest-timer banner when one is running. */
const TIMER_SPACE = 130;
const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** The check-in card never gets shorter than this; a small phone scrolls instead. */
const MIN_CHECKIN_HEIGHT = 420;

const pad = (n: number) => String(n).padStart(2, '0');

const elapsedTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  return m < 60 ? `${pad(m)}:${pad(seconds % 60)}` : `${Math.floor(m / 60)}:${pad(m % 60)}:${pad(seconds % 60)}`;
};

interface Props {
  /** Called when today is punched in. The router switches to the Gym Progress tab. */
  onOpenWorkout: (date: string) => void;
  onSettings: () => void;
}

/** The big raised button: it sinks into its lip while pressed. */
function PunchButton({ onPress }: { onPress: () => void }) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Punch In / Start Workout"
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
    >
      <View style={{ position: 'absolute', top: 6, right: 0, bottom: 0, left: 0, borderRadius: 20, backgroundColor: colors.accentLip }} />
      <View
        style={{
          position: 'absolute',
          top: pressed ? 5 : 0,
          right: 0,
          bottom: pressed ? 1 : 6,
          left: 0,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          borderRadius: 20,
          backgroundColor: colors.accent,
        }}
      >
        <Svg width={420} height={420} viewBox="-210 -210 420 420" fill="none" stroke="#000" strokeWidth={2} style={{ position: 'absolute', top: '36%', marginTop: -210 }}>
          <Circle r={76} opacity={0.2} />
          <Circle r={112} opacity={0.14} />
          <Circle r={150} opacity={0.09} />
          <Circle r={190} opacity={0.05} />
        </Svg>
        <FingerprintIcon size={92} color="#000" stroke={1.5} />
        <Text style={{ color: '#000', fontFamily: fonts.display, fontSize: 44, lineHeight: 44, textAlign: 'center', textTransform: 'uppercase' }}>{'Punch In /\nStart Workout'}</Text>
      </View>
    </Pressable>
  );
}

function Panel({ tint, border, tight = false, children }: { tint: string; border: string; tight?: boolean; children: ReactNode }) {
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 6,
        left: 0,
        paddingHorizontal: 16,
        paddingTop: tight ? 12 : 16,
        paddingBottom: tight ? 4 : 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: tight ? 4 : 6,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: border,
        backgroundColor: tint,
      }}
    >
      {children}
    </View>
  );
}

const Undo = ({ label, onPress, flush = false }: { label: string; onPress: () => void; flush?: boolean }) => (
  <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className="justify-center active:opacity-60" style={{ height: 44, marginTop: flush ? 0 : 4, paddingHorizontal: 12 }}>
    <Text style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 14, textDecorationLine: 'underline' }}>{label}</Text>
  </Pressable>
);

function PunchedPanel({ at, onOut, onUndo }: { at: number; onOut: () => void; onUndo: (() => void) | null }) {
  const now = useNow(true, 1000);
  return (
    <Panel tint={colors.accentPanel} border={colors.accent} tight>
      <View className="items-center justify-center" style={{ width: 44, height: 44, marginBottom: 6, borderRadius: 22, backgroundColor: colors.accent }}>
        <CheckIcon size={24} color="#000" stroke={2.8} />
      </View>
      <Text style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 16, lineHeight: 24 }}>Punched in at {clockTime(at)}</Text>
      <Text style={{ color: colors.secondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>Workout time</Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        accessibilityRole="timer"
        style={{ color: colors.accent, fontFamily: fonts.display, fontSize: 76, lineHeight: 80, fontVariant: ['tabular-nums'] }}
      >
        {elapsedTime(Math.max(0, Math.floor((now - at) / 1000)))}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Punch Out"
        onPress={onOut}
        className="w-full flex-row items-center justify-center active:opacity-80"
        style={{ height: 56, marginTop: 6, gap: 10, borderRadius: 14, backgroundColor: '#fff' }}
      >
        <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: '#000' }} />
        <Text style={{ color: '#000', fontFamily: fonts.display, fontSize: 26, textTransform: 'uppercase' }}>Punch Out</Text>
      </Pressable>
      {onUndo ? <Undo label="Undo punch-in" onPress={onUndo} flush /> : null}
    </Panel>
  );
}

function PunchedOutPanel({ at, out, onUndo }: { at: number; out: number; onUndo: () => void }) {
  return (
    <Panel tint={colors.panel} border={colors.border}>
      <View className="items-center justify-center" style={{ width: 56, height: 56, marginBottom: 10, borderRadius: 28, backgroundColor: colors.fill }}>
        <CheckIcon size={30} color={colors.accent} stroke={2.8} />
      </View>
      <Text style={{ color: colors.secondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>Time in the gym</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: '#fff', fontFamily: fonts.display, fontSize: 88, lineHeight: 92, fontVariant: ['tabular-nums'] }}>
        {elapsedTime(Math.max(0, Math.floor((out - at) / 1000)))}
      </Text>
      <Text style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 16, lineHeight: 24 }}>
        {clockTime(at)} to {clockTime(out)}
      </Text>
      <Undo label="Undo punch-out" onPress={onUndo} />
    </Panel>
  );
}

function MarkedPanel({ status, onUndo }: { status: Status; onUndo: (() => void) | null }) {
  const { label, color } = STATUS_META[status];
  const tint = status === 'present' ? colors.accentPanel : status === 'absent' ? colors.dangerPanel : colors.holidayPanel;
  return (
    <Panel tint={tint} border={color}>
      <View className="items-center justify-center" style={{ width: 56, height: 56, marginBottom: 10, borderRadius: status === 'holiday' ? 16 : 28, backgroundColor: color }}>
        {status === 'absent' ? <CrossIcon /> : status === 'holiday' ? <SunIcon /> : <CheckIcon size={30} color="#000" stroke={2.8} />}
      </View>
      <Text style={{ color, fontFamily: fonts.display, fontSize: 72, lineHeight: 76, textTransform: 'uppercase' }}>{label}</Text>
      {status === 'present' ? null : <Text style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 16, lineHeight: 24 }}>{status === 'absent' ? 'Streak back to 0' : 'Planned rest, streak kept'}</Text>}
      {onUndo ? <Undo label="Undo" onPress={onUndo} /> : null}
    </Panel>
  );
}

const Quick = ({ label, dot, radius, onPress }: { label: string; dot: string; radius: number; onPress: () => void }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    className="flex-1 flex-row items-center justify-center active:opacity-70"
    style={{ height: 44, gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.chip }}
  >
    <View style={{ width: 11, height: 11, borderRadius: radius, backgroundColor: dot }} />
    <Text style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 15 }}>{label}</Text>
  </Pressable>
);

/** One day of the week row. Colours come from the 7-day capsule rules. */
function WeekTile({ date, label, today, status, onPress }: { date: string; label: string; today: string; status: Status | undefined; onPress: () => void }) {
  const isToday = date === today && !status;
  const open = !status && !isToday;
  const fill = status ? CAPSULE_COLORS[status] : isToday ? 'transparent' : colors.control;
  const word = status ? STATUS_META[status].label : isToday ? 'today, not marked' : date > today ? 'upcoming' : 'not marked';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${weekdayLong(date)} ${dayMonthLong(date)}, ${word}. Open calendar`}
      onPress={onPress}
      className="flex-1"
      style={{ height: 78, padding: isToday ? 1 : 3, gap: 3, borderRadius: 16, borderWidth: isToday ? 2 : 0, borderColor: colors.accent, backgroundColor: fill }}
    >
      <View className="items-center justify-center" style={{ height: 44, borderRadius: 13, backgroundColor: open ? colors.outline : '#fff' }}>
        <Text style={{ color: open ? colors.secondary : '#000', fontFamily: fonts.bold, fontSize: 18, fontVariant: ['tabular-nums'] }}>{Number(date.slice(8, 10))}</Text>
      </View>
      <Text style={{ color: open ? colors.muted : isToday ? colors.accent : '#000', fontFamily: fonts.bold, fontSize: 12, lineHeight: 18, textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

/** Home screen: today's check-in, this week's attendance, and the calendar popup. */
export function CalendarScreen({ onOpenWorkout, onSettings }: Props) {
  const { realToday } = useGym();
  const { marks, statuses, stats, punchedAt, punchedOutAt, missed, punchOut, undoPunchOut, saveLeft, skipLeft, setStatus } = useAttendance();
  const { timer } = useTimer();
  const insets = useSafeAreaInsets();

  const [punchOpen, setPunchOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState<string | null>(null);
  const [savedVisit, setSavedVisit] = useState<string | null>(null);

  const status = statuses[realToday];
  const start = weekStartKey(realToday);

  const openCalendar = (date: string) => {
    haptic.tap();
    setCalendarDate(date);
  };

  const punch = (next: Status) => {
    haptic.pulse();
    setStatus(realToday, next);
    setPunchOpen(false);
    if (next === 'present') onOpenWorkout(realToday);
  };

  const mark = (next: Status) => {
    haptic.pulse();
    setStatus(realToday, next);
  };

  // A day that is Present only because sets were logged has no mark to undo.
  const undo = marks[realToday]
    ? () => {
        haptic.tap();
        setStatus(realToday, null);
      }
    : null;

  return (
    <View className="flex-1 bg-base">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top, paddingBottom: timer.status !== 'idle' ? TIMER_SPACE : 10 }}>
        <View className="flex-row items-center justify-between" style={{ height: 44, marginTop: 12, paddingLeft: 20, paddingRight: 12 }}>
          <Text style={{ color: '#fff', fontFamily: fonts.display, fontSize: 26, letterSpacing: 0.2 }}>
            LogSet<Text style={{ color: colors.accent }}>Go</Text>
          </Text>
          <View className="flex-row">
            <Pressable accessibilityRole="button" accessibilityLabel="Open attendance calendar" onPress={() => openCalendar(realToday)} className="items-center justify-center active:opacity-60" style={{ width: 44, height: 44 }}>
              <CalendarIcon />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Settings"
              onPress={() => {
                haptic.tap();
                onSettings();
              }}
              className="items-center justify-center active:opacity-60"
              style={{ width: 44, height: 44 }}
            >
              <SlidersIcon size={24} stroke={1.9} />
            </Pressable>
          </View>
        </View>

        <View
          accessibilityLabel="Today’s check-in"
          className="flex-1"
          style={{ minHeight: MIN_CHECKIN_HEIGHT, marginTop: 8, marginHorizontal: 16, padding: 16, gap: 14, borderRadius: 24, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface }}
        >
          <View className="flex-row items-start justify-between" style={{ gap: 12 }}>
            <View>
              <Text style={{ color: colors.secondary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 }}>Today’s check-in</Text>
              <Text style={{ color: '#fff', fontFamily: fonts.display, fontSize: 30, lineHeight: 36 }}>{dayMonthShort(realToday)}</Text>
            </View>
            <View className="justify-center" style={{ height: 28, paddingHorizontal: 11, borderRadius: 14, backgroundColor: colors.chip }}>
              <Text style={{ color: status ? STATUS_META[status].color : colors.secondary, fontFamily: fonts.semibold, fontSize: 13 }}>{status ? STATUS_META[status].label : 'Not in yet'}</Text>
            </View>
          </View>

          {savedVisit ? (
            <View accessibilityLiveRegion="polite" className="flex-row items-center" style={{ minHeight: 44, paddingHorizontal: 12, paddingVertical: 6, gap: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.chip }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent }} />
              <Text className="flex-1" style={{ color: '#fff', fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>
                {savedVisit}
              </Text>
            </View>
          ) : null}

          <View className="flex-1">
            {!status ? (
              <PunchButton
                onPress={() => {
                  haptic.tap();
                  setPunchOpen(true);
                }}
              />
            ) : status === 'present' && punchedAt && punchedOutAt ? (
              <PunchedOutPanel
                at={punchedAt}
                out={punchedOutAt}
                onUndo={() => {
                  haptic.tap();
                  undoPunchOut();
                }}
              />
            ) : status === 'present' && punchedAt ? (
              <PunchedPanel
                at={punchedAt}
                onOut={() => {
                  haptic.pulse();
                  punchOut();
                }}
                onUndo={undo}
              />
            ) : (
              <MarkedPanel status={status} onUndo={undo} />
            )}
          </View>

          {status ? (
            <Text accessibilityLiveRegion="polite" style={{ color: colors.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, textAlign: 'center' }}>
              {status === 'present' ? (punchedOutAt ? 'You can still log sets today.' : 'Today is marked Present.') : 'Undo to punch in instead.'}
            </Text>
          ) : (
            <View className="flex-row" style={{ gap: 8 }}>
              <Quick label="Absent" dot={colors.danger} radius={6} onPress={() => mark('absent')} />
              <Quick label="Holiday" dot={colors.holiday} radius={3} onPress={() => mark('holiday')} />
            </View>
          )}
        </View>

        <View accessibilityLabel="This week’s attendance" style={{ paddingTop: 8, paddingHorizontal: 20 }}>
          <View className="flex-row items-center justify-between" style={{ gap: 8 }}>
            <Text style={{ color: colors.secondary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 }}>This Week’s Attendance Streak</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${stats.streak} day streak. Open attendance calendar`}
              onPress={() => openCalendar(realToday)}
              className="flex-row items-center active:opacity-60"
              style={{ height: 44, marginRight: -8, paddingHorizontal: 8, gap: 4 }}
            >
              <Text style={{ color: colors.accent, fontFamily: fonts.bold, fontSize: 14 }}>
                {stats.streak} {stats.streak === 1 ? 'day' : 'days'}
              </Text>
              <ChevronRightIcon size={16} color={colors.accent} stroke={2.8} />
            </Pressable>
          </View>
          <View className="flex-row" style={{ marginTop: 2, gap: 5 }}>
            {WEEK_LABELS.map((label, i) => {
              const date = addDays(start, i);
              return <WeekTile key={date} date={date} label={label} today={realToday} status={statuses[date]} onPress={() => openCalendar(date)} />;
            })}
          </View>
        </View>
      </ScrollView>

      {missed ? (
        <MissedPunchOutSheet
          date={missed.date}
          visit={missed.visit}
          today={realToday}
          onSave={(at) => {
            haptic.tap();
            saveLeft(missed.date, at);
            setSavedVisit(`Saved: ${spentTime(missed.visit.in, at)} in the gym ${missed.date === addDays(realToday, -1) ? 'yesterday' : `on ${dayMonthShort(missed.date)}`}.`);
          }}
          onSkip={() => {
            haptic.tap();
            skipLeft(missed.date);
          }}
        />
      ) : null}

      <AttendanceStatusSheet visible={punchOpen} onSelect={punch} onClose={() => setPunchOpen(false)} />
      <CalendarSheet visible={calendarDate != null} date={calendarDate ?? realToday} onClose={() => setCalendarDate(null)} />
    </View>
  );
}
