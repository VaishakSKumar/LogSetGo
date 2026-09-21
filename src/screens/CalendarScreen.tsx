import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnalyticsCard } from '../components/attendance/AnalyticsCard';
import { DateTile, EmptyTile } from '../components/attendance/DateTile';
import { StatusSheet } from '../components/attendance/StatusSheet';
import { ChevronLeftIcon, ChevronRightIcon } from '../components/Icons';
import { Caption } from '../components/ui';
import { isFuture, STATUS_META, STATUSES, type Status } from '../lib/attendance';
import { dayOfMonth, firstOfMonth, monthGrid, monthTitle, shiftMonth } from '../lib/calendar';
import { WEEKDAY_LETTERS, headerDate } from '../lib/dates';
import { haptic } from '../lib/haptics';
import { useAttendance } from '../store/attendance';
import { useGym } from '../store/gym';
import { useTimer } from '../store/timer';
import { colors } from '../theme';

/** Room for the docked rest-timer banner when one is running. */
const TIMER_SPACE = 150;

interface Props {
  /** Called after "Present" is chosen for a date. The router switches to the Gym Progress tab. */
  onOpenWorkout: (date: string) => void;
}

/** Home screen: analytics, a month matrix of status tiles, and the status picker. */
export function CalendarScreen({ onOpenWorkout }: Props) {
  const { realToday } = useGym();
  const { marks, statuses, stats, setStatus } = useAttendance();
  const { timer } = useTimer();
  const insets = useSafeAreaInsets();

  const [month, setMonth] = useState(() => firstOfMonth(realToday));
  const [picked, setPicked] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const weeks = useMemo(() => monthGrid(month), [month]);
  const onCurrentMonth = month === firstOfMonth(realToday);

  const openSheet = useCallback((date: string) => {
    haptic.tap();
    setPicked(date);
    setSheetOpen(true);
  }, []);

  const closeSheet = () => setSheetOpen(false);

  const choose = (status: Status) => {
    if (!picked) return;
    haptic.pulse();
    setStatus(picked, status);
    setSheetOpen(false);
    // Present hands off to the workout screen; Absent and Holiday stay right here.
    if (status === 'present') onOpenWorkout(picked);
  };

  const clear = () => {
    if (!picked) return;
    haptic.tap();
    setStatus(picked, null);
    setSheetOpen(false);
  };

  const step = (n: number) => {
    haptic.tap();
    setMonth((m) => shiftMonth(m, n));
  };

  return (
    <View className="flex-1 bg-base">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: timer.status !== 'idle' ? TIMER_SPACE : insets.bottom + 32 }}
      >
        <View>
          <Text className="text-caption uppercase tracking-wider text-muted/60">{headerDate(realToday)}</Text>
          <Text className="py-1 text-h1 text-label">Attendance</Text>
        </View>

        <AnalyticsCard stats={stats} />

        {/* Month navigator */}
        <View className="-mb-2 flex-row items-center justify-between">
          <Text className="px-1 text-h2 text-label" accessibilityRole="header">
            {monthTitle(month)}
          </Text>
          <View className="flex-row items-center gap-2">
            {!onCurrentMonth ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  haptic.tap();
                  setMonth(firstOfMonth(realToday));
                }}
                className="h-11 justify-center rounded-full bg-fill px-4 active:opacity-70"
              >
                <Text className="text-body text-label">Today</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              onPress={() => step(-1)}
              className="h-11 w-11 items-center justify-center rounded-full bg-fill active:opacity-60"
            >
              <ChevronLeftIcon />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              onPress={() => step(1)}
              className="h-11 w-11 items-center justify-center rounded-full bg-fill active:opacity-60"
            >
              <ChevronRightIcon />
            </Pressable>
          </View>
        </View>

        {/* 7-column matrix, 8pt gaps */}
        <View style={{ gap: 8 }}>
          <View className="flex-row" style={{ gap: 8 }}>
            {WEEKDAY_LETTERS.map((l, i) => (
              <Text key={i} className="flex-1 text-center text-caption uppercase tracking-wider text-muted/60">
                {l}
              </Text>
            ))}
          </View>
          {weeks.map((week, w) => (
            <View key={w} className="flex-row" style={{ gap: 8 }}>
              {week.map((date, i) =>
                date ? (
                  <DateTile
                    key={date}
                    date={date}
                    day={dayOfMonth(date)}
                    status={statuses[date]}
                    isToday={date === realToday}
                    isFuture={isFuture(date, realToday)}
                    onPress={openSheet}
                  />
                ) : (
                  <EmptyTile key={`empty-${w}-${i}`} />
                ),
              )}
            </View>
          ))}
        </View>

        {/* Legend */}
        <View className="flex-row items-center justify-center gap-5">
          {STATUSES.map((s) => (
            <View key={s} className="flex-row items-center gap-2">
              <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: STATUS_META[s].color }} />
              <Text className="text-caption text-muted">
                {STATUS_META[s].letter} · {STATUS_META[s].label}
              </Text>
            </View>
          ))}
        </View>
        <Caption className="-mt-2 text-center">Tap a date to log it. Present opens your workout.</Caption>
      </ScrollView>

      <StatusSheet
        visible={sheetOpen}
        date={picked}
        current={picked ? statuses[picked] : undefined}
        canClear={picked ? !!marks[picked] : false}
        isToday={picked === realToday}
        isFuture={picked ? isFuture(picked, realToday) : false}
        onSelect={choose}
        onClear={clear}
        onClose={closeSheet}
      />
    </View>
  );
}
