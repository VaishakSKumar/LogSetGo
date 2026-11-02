import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { STATUS_META, STATUSES, isFuture, type Status, type StatusMap } from '../../lib/attendance';
import { firstOfMonth, dayMonthLong, monthName, monthGrid, shiftMonth, weekdayLong, weekdayShort } from '../../lib/calendar';
import { addDays, weekStartKey } from '../../lib/dates';
import { haptic } from '../../lib/haptics';
import { useSwipe } from '../../lib/useSwipe';
import { useAttendance } from '../../store/attendance';
import { useGym } from '../../store/gym';
import { colors, fonts } from '../../theme';
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from '../Icons';
import { DayStatusButtons } from './DayStatusButtons';

const WEEKDAY_HEADS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SHEET_HEIGHT = 640;
/** The artboard's width: dial positions scale from it. */
const BASE_WIDTH = 360;

type View_ = 'weekly' | 'monthly';

const describe = (date: string, statuses: StatusMap, today: string) => {
  const s = statuses[date];
  const word = s ? STATUS_META[s].label : date > today ? 'upcoming' : date === today ? 'today, not marked' : 'not marked';
  return `${weekdayLong(date)} ${dayMonthLong(date)}, ${word}`;
};

function Dial({ selected, today, statuses, width, onPick }: { selected: string; today: string; statuses: StatusMap; width: number; onPick: (date: string) => void }) {
  const scale = width / BASE_WIDTH;
  return (
    <View style={{ height: 176, marginTop: 8, marginHorizontal: -16, overflow: 'hidden' }}>
      <Svg width={width} height={176} viewBox={`0 0 ${BASE_WIDTH} 176`} preserveAspectRatio="none" style={{ position: 'absolute', left: 0, top: 0 }}>
        <Path d="M-20 92 Q180 20 380 92 L380 160 Q180 88 -20 160 Z" fill="#FFFFFF" fillOpacity={0.05} stroke="#FFFFFF" strokeOpacity={0.16} />
      </Svg>
      {[-3, -2, -1, 0, 1, 2, 3].map((i) => {
        const date = addDays(selected, i);
        const status = statuses[date];
        const center = i === 0;
        const lift = 2.43 * i * i;
        const x = (180 + i * 52) * scale;
        const size = center ? 54 : 36;
        const fade = Math.abs(i) === 3 ? 0.62 : 1;
        return (
          <View key={date} pointerEvents="box-none">
            <Text
              style={{
                position: 'absolute',
                left: x - 24,
                top: 24 + lift,
                width: 48,
                textAlign: 'center',
                color: '#fff',
                opacity: fade,
                fontFamily: center ? fonts.bold : fonts.medium,
                fontSize: 14,
                lineHeight: 20,
                transform: [{ rotate: `${i * 3}deg` }],
              }}
            >
              {weekdayShort(date)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={describe(date, statuses, today)}
              accessibilityState={{ selected: center }}
              onPress={() => onPick(date)}
              style={{ position: 'absolute', left: x - 27, top: 90 + lift - 27, width: 54, height: 54, alignItems: 'center', justifyContent: 'center', opacity: fade }}
            >
              <View
                style={{
                  width: size,
                  height: size,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: status === 'holiday' ? 9 : size / 2,
                  backgroundColor: status ? STATUS_META[status].color : center ? '#fff' : 'transparent',
                  borderWidth: date === today && !status ? 2 : 0,
                  borderColor: colors.accent,
                }}
              >
                <Text
                  style={{
                    color: status || center ? '#000' : date > today ? colors.faint : colors.secondary,
                    fontFamily: fonts.bold,
                    fontSize: center ? 24 : 15,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {Number(date.slice(8, 10))}
                </Text>
              </View>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

function MonthCell({ date, selected, today, status, label, onPick }: { date: string; selected: boolean; today: string; status: Status | undefined; label: string; onPick: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPick}
      className="flex-1 items-center justify-center"
      style={{ height: 41 }}
    >
      <View style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: status === 'holiday' ? 12 : 19, borderWidth: selected ? 2 : 0, borderColor: '#fff' }}>
        <View
          style={{
            width: 32,
            height: 32,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: status === 'holiday' ? 9 : 16,
            backgroundColor: status ? STATUS_META[status].color : 'transparent',
            borderWidth: date === today && !status ? 2 : 0,
            borderColor: colors.accent,
          }}
        >
          <Text style={{ color: status ? '#000' : date > today ? colors.faint : '#fff', fontFamily: fonts.semibold, fontSize: 15, fontVariant: ['tabular-nums'] }}>{Number(date.slice(8, 10))}</Text>
        </View>
      </View>
    </Pressable>
  );
}

interface Props {
  visible: boolean;
  /** The date selected when the sheet opens. */
  date: string;
  onClose: () => void;
  /** Called whenever the selected date changes, so Gym Progress can follow along. */
  onPickDate?: (date: string) => void;
}

/** The attendance calendar: a weekly dial and a monthly grid, with a status picker for the selected date. */
export function CalendarSheet({ visible, date, onClose, onPickDate }: Props) {
  const { width, height } = useWindowDimensions();
  const { realToday } = useGym();
  const { statuses, setStatus } = useAttendance();

  const [view, setView] = useState<View_>('weekly');
  const [selected, setSelected] = useState(date);
  const [month, setMonth] = useState(firstOfMonth(date));

  useEffect(() => {
    if (!visible) return;
    setSelected(date);
    setMonth(firstOfMonth(date));
  }, [visible, date]);

  // The titles keep their full size until a long month would run off the sheet (about 0.47em a character).
  const room = width - 32;
  const dayTitle = Math.min(78, Math.floor(room / ((monthName(selected).length + String(Number(selected.slice(8, 10))).length + 0.5) * 0.47)));
  const monthTitle = Math.min(52, Math.floor((room - 148) / (monthName(month).length * 0.47)));

  const pick = (next: string) => {
    haptic.tap();
    setSelected(next);
    setMonth(firstOfMonth(next));
    onPickDate?.(next);
  };

  const stepMonth = (n: number) => {
    haptic.tap();
    setMonth((m) => shiftMonth(m, n));
  };

  const swipe = useSwipe((direction) => {
    if (view === 'weekly') pick(addDays(selected, direction * 7));
    else stepMonth(direction);
  });

  const weeks = useMemo(() => monthGrid(month).filter((w) => w.some(Boolean)), [month]);
  const range = useMemo(
    () => (view === 'weekly' ? Array.from({ length: 7 }, (_, i) => addDays(weekStartKey(selected), i)) : weeks.flat().filter((d): d is string => !!d)),
    [view, selected, weeks],
  );

  const current = statuses[selected];
  const future = isFuture(selected, realToday);

  const segment = (key: View_, label: string) => {
    const on = view === key;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: on }}
        onPress={() => setView(key)}
        className="flex-1 items-center justify-center"
        style={{ borderRadius: 10, backgroundColor: on ? '#fff' : 'transparent' }}
      >
        <Text style={{ color: on ? '#000' : colors.secondary, fontFamily: fonts.bold, fontSize: 15 }}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)' }}>
        <Pressable accessibilityLabel="Close calendar" style={{ flex: 1 }} onPress={onClose} />
        <View
          {...swipe}
          accessibilityLabel="Attendance calendar"
          style={{
            height: Math.min(SHEET_HEIGHT, height - 40),
            paddingTop: 10,
            paddingHorizontal: 16,
            paddingBottom: 16,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.panel,
          }}
        >
          <View style={{ width: 36, height: 4, marginBottom: 12, borderRadius: 2, alignSelf: 'center', backgroundColor: colors.handle }} />

          <View className="flex-row" style={{ gap: 8 }}>
            <View className="flex-1 flex-row" style={{ height: 48, padding: 4, gap: 4, borderRadius: 14, backgroundColor: colors.fill }}>
              {segment('weekly', 'Weekly')}
              {segment('monthly', 'Monthly')}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close calendar"
              onPress={onClose}
              className="items-center justify-center active:opacity-60"
              style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.fill }}
            >
              <CloseIcon size={20} color="#fff" />
            </Pressable>
          </View>

          {view === 'weekly' ? (
            <>
              <View className="flex-row items-baseline justify-between" style={{ marginTop: 16, height: 84 }}>
                <Text style={{ color: '#fff', fontFamily: fonts.display, fontSize: dayTitle, lineHeight: 84 }}>{monthName(selected)}</Text>
                <Text style={{ color: '#fff', fontFamily: fonts.display, fontSize: dayTitle, lineHeight: 84 }}>{Number(selected.slice(8, 10))}</Text>
              </View>
              <Dial selected={selected} today={realToday} statuses={statuses} width={width} onPick={pick} />
            </>
          ) : (
            <>
              <View className="flex-row items-center justify-between" style={{ marginTop: 12, marginBottom: 4 }}>
                <Text numberOfLines={1} style={{ flex: 1, color: '#fff', fontFamily: fonts.display, fontSize: monthTitle, lineHeight: 56 }}>
                  {monthName(month)} <Text style={{ color: colors.muted, fontFamily: fonts.condensed, fontSize: 30 }}>{month.slice(0, 4)}</Text>
                </Text>
                <View className="flex-row" style={{ marginRight: -8 }}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => stepMonth(-1)} className="items-center justify-center" style={{ width: 44, height: 44 }}>
                    <ChevronLeftIcon size={22} stroke={2.4} />
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => stepMonth(1)} className="items-center justify-center" style={{ width: 44, height: 44 }}>
                    <ChevronRightIcon size={22} stroke={2.4} />
                  </Pressable>
                </View>
              </View>
              <View className="flex-row">
                {WEEKDAY_HEADS.map((d) => (
                  <Text key={d} style={{ flex: 1, textAlign: 'center', color: colors.muted, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 18 }}>
                    {d}
                  </Text>
                ))}
              </View>
              {weeks.map((week, w) => (
                <View key={w} className="flex-row">
                  {week.map((d, i) =>
                    d ? (
                      <MonthCell key={d} date={d} selected={d === selected} today={realToday} status={statuses[d]} label={describe(d, statuses, realToday)} onPick={() => pick(d)} />
                    ) : (
                      <View key={`blank-${i}`} className="flex-1" style={{ height: 41 }} />
                    ),
                  )}
                </View>
              ))}
            </>
          )}

          <View className="flex-row" style={{ marginTop: 'auto', gap: 8 }}>
            {STATUSES.map((s) => (
              <View key={s} className="flex-1 flex-row items-center" style={{ gap: 6 }}>
                <View style={{ width: 11, height: 11, borderRadius: s === 'holiday' ? 3 : 6, backgroundColor: STATUS_META[s].color }} />
                <Text style={{ color: colors.secondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 }}>{STATUS_META[s].label}</Text>
                <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 13, lineHeight: 20 }}>{range.filter((d) => statuses[d] === s).length}</Text>
              </View>
            ))}
          </View>

          <View style={{ marginTop: 10, padding: 12, borderRadius: 18, backgroundColor: colors.raised }}>
            <View className="flex-row items-baseline justify-between" style={{ gap: 8 }}>
              <Text style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 }}>
                {weekdayLong(selected)}, {dayMonthLong(selected)}
              </Text>
              <Text style={{ color: colors.secondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 22 }}>{current ? STATUS_META[current].label : future ? 'Upcoming' : 'Not marked'}</Text>
            </View>
            <View style={{ marginTop: 8 }}>
              <DayStatusButtons
                date={selected}
                today={realToday}
                current={current}
                onChange={(status) => {
                  haptic.pulse();
                  setStatus(selected, status);
                }}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
