import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { ChevronLeftIcon, ChevronRightIcon } from '../../components/Icons';
import { Sheet } from '../../components/Sheet';
import { streakOf } from '../../lib/attendance';
import { firstOfMonth, monthName, shiftMonth } from '../../lib/calendar';
import { haptic } from '../../lib/haptics';
import { bestStreak, monthProgress, weekProgress } from '../../lib/insights';
import { useAttendance } from '../../store/attendance';
import { useGym } from '../../store/gym';
import { useTimer } from '../../store/timer';
import { colors, fonts } from '../../theme';
import { PageHeader } from './PageHeader';

const GREEN_START = '#149C7E';
const ARC = 'M22 150 A130 130 0 0 1 282 150';
const ARC_LENGTH = Math.PI * 130;
const card = { padding: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel } as const;
const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

function TickBar({ percent, goal }: { percent: number; goal: number }) {
  const [width, setWidth] = useState(0);
  const filled = (width * percent) / 100;
  const ticks = Math.round(((100 - percent) / 100) * 22);
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${percent} percent of your weekly goal of ${days(goal)}`}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: 40, marginTop: 6 }}
    >
      <View className="flex-row justify-between" style={{ position: 'absolute', left: filled + (percent ? 8 : 0), right: 0, bottom: 0, height: 28 }}>
        {Array.from({ length: ticks }, (_, i) => (
          <View key={i} style={{ width: 4, height: 28, borderRadius: 2, backgroundColor: colors.outline }} />
        ))}
      </View>
      {percent > 0 && width > 0 ? (
        <>
          <View className="items-end justify-center overflow-hidden" style={{ position: 'absolute', left: 0, bottom: 0, width: filled, height: 28, paddingRight: percent < 20 ? 4 : 8, borderRadius: 8 }}>
            <Svg style={{ position: 'absolute', top: 0, left: 0 }} width={filled} height={28}>
              <Defs>
                <LinearGradient id="week-fill" x1="0" x2="1" y1="0" y2="0">
                  <Stop offset="0" stopColor={GREEN_START} />
                  <Stop offset="1" stopColor={colors.accent} />
                </LinearGradient>
              </Defs>
              <Rect width={filled} height={28} fill="url(#week-fill)" />
            </Svg>
            <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.32)' }}>
              <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, fontVariant: ['tabular-nums'] }}>{percent}%</Text>
            </View>
          </View>
          <View style={{ position: 'absolute', left: Math.min(filled, width - 5) + 2, top: 8, bottom: 0, width: 3, borderRadius: 2, backgroundColor: '#fff' }} />
          <View style={{ position: 'absolute', left: Math.min(filled, width - 12), top: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff' }} />
        </>
      ) : null}
    </View>
  );
}

function Gauge({ rate, label }: { rate: number | null; label: string }) {
  const value = rate ?? 0;
  const angle = Math.PI * (1 - value / 100);
  return (
    <Svg width="100%" height={158} viewBox="0 0 304 158" accessibilityRole="image" accessibilityLabel={label}>
      <Defs>
        <LinearGradient id="gauge-fill" gradientUnits="userSpaceOnUse" x1="22" x2="282" y1="0" y2="0">
          <Stop offset="0" stopColor={GREEN_START} />
          <Stop offset="1" stopColor={colors.accent} />
        </LinearGradient>
      </Defs>
      <Path d={ARC} fill="none" stroke={colors.border} strokeWidth={16} strokeLinecap="round" />
      {value > 0 ? <Path d={ARC} fill="none" stroke="url(#gauge-fill)" strokeWidth={16} strokeLinecap="round" strokeDasharray={[(value / 100) * ARC_LENGTH, ARC_LENGTH]} /> : null}
      {rate != null ? <Circle cx={152 + 130 * Math.cos(angle)} cy={150 - 130 * Math.sin(angle)} r={10} fill="#fff" stroke={colors.panel} strokeWidth={3} /> : null}
    </Svg>
  );
}

function Streak({ title, value }: { title: string; value: number }) {
  return (
    <View className="flex-1" style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel }}>
      <Text style={{ color: colors.secondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 }}>{title}</Text>
      <Text style={{ color: '#fff', fontFamily: fonts.display, fontSize: 28, lineHeight: 32, fontVariant: ['tabular-nums'] }}>{days(value)}</Text>
    </View>
  );
}

function MonthArrow({ label, enabled, onPress, children }: { label: string; enabled: boolean; onPress: () => void; children: (color: string) => React.ReactNode }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !enabled }} onPress={enabled ? onPress : undefined} className="items-center justify-center" style={{ width: 40, height: 44 }}>
      {children(enabled ? '#fff' : '#5A5E5A')}
    </Pressable>
  );
}

/** How you are showing up: this week against your goal, a month out of 100, and your streaks. */
export function AttendanceStatsPage({ onBack }: { onBack: () => void }) {
  const { realToday, data, actions } = useGym();
  const { statuses } = useAttendance();
  const { timer } = useTimer();
  const [month, setMonth] = useState(firstOfMonth(realToday));
  const [goalOpen, setGoalOpen] = useState(false);

  const goal = data.prefs.weeklyGoalDays;
  const week = weekProgress(statuses, realToday, goal);
  const stats = monthProgress(statuses, month);
  const currentMonth = firstOfMonth(realToday);
  const marked = Object.keys(statuses).sort();
  const firstMonth = marked.length ? firstOfMonth(marked[0]) : currentMonth;
  const monthLabel = `${monthName(month).slice(0, 3)} ${month.slice(0, 4)}`;
  const left = Math.max(0, goal - week.done);

  const counts = [
    { label: 'Present', value: stats.present, color: colors.accent, radius: 5 },
    { label: 'Absent', value: stats.absent, color: colors.danger, radius: 5 },
    { label: 'Holiday', value: stats.holiday, color: colors.holiday, radius: 3 },
  ];

  return (
    <View className="flex-1 bg-base">
      <PageHeader title="Gym Attendance" onBack={onBack} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: timer.status !== 'idle' ? 150 : 6, gap: 10 }}>
        <View accessibilityLabel="Weekly progress" style={card}>
          <Text accessibilityRole="header" style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 }}>
            Weekly progress
          </Text>
          <View className="flex-row items-center" style={{ marginTop: 2, gap: 10 }}>
            <Text style={{ color: '#fff', fontFamily: fonts.display, fontSize: 56, lineHeight: 56, fontVariant: ['tabular-nums'] }}>{week.done}</Text>
            <View>
              <Text style={{ color: week.change > 0 ? colors.accent : colors.secondary, fontFamily: fonts.bold, fontSize: 14, lineHeight: 20 }}>
                {week.change === 0 ? 'Same' : `${week.change > 0 ? '+' : '−'}${days(Math.abs(week.change))}`}
              </Text>
              <Text style={{ color: colors.secondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>{week.change === 0 ? 'as last week' : 'from last week'}</Text>
            </View>
            <Text className="ml-auto self-end" style={{ color: colors.secondary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 }}>
              100%
            </Text>
          </View>
          <TickBar percent={week.percent} goal={goal} />
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Change your weekly goal"
            onPress={() => setGoalOpen(true)}
            className="flex-row items-center justify-between active:opacity-70"
            style={{ minHeight: 44, marginTop: 10, paddingHorizontal: 12, gap: 8, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.raised }}
          >
            <Text style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 14 }}>
              {week.done} of {days(goal)} done, {left ? `${left} to go` : 'goal reached'}
            </Text>
            <ChevronRightIcon size={18} color="#fff" stroke={2.4} />
          </Pressable>
        </View>

        <View accessibilityLabel="Monthly progress" style={card}>
          <View className="flex-row items-center justify-between">
            <Text accessibilityRole="header" style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 }}>
              Monthly progress
            </Text>
            <View className="flex-row items-center" style={{ marginRight: -8 }}>
              <MonthArrow label="Previous month" enabled={month > firstMonth} onPress={() => setMonth(shiftMonth(month, -1))}>
                {(c) => <ChevronLeftIcon size={18} color={c} stroke={2.4} />}
              </MonthArrow>
              <Text accessibilityLiveRegion="polite" className="text-center" style={{ width: 74, color: '#fff', fontFamily: fonts.semibold, fontSize: 14 }}>
                {monthLabel}
              </Text>
              <MonthArrow label="Next month" enabled={month < currentMonth} onPress={() => setMonth(shiftMonth(month, 1))}>
                {(c) => <ChevronRightIcon size={18} color={c} stroke={2.4} />}
              </MonthArrow>
            </View>
          </View>

          <View style={{ height: 158 }}>
            <Gauge rate={stats.rate} label={stats.rate == null ? `No days marked in ${monthLabel}` : `${stats.rate} out of 100 for ${monthLabel}`} />
            <View className="items-center" style={{ position: 'absolute', left: 0, right: 0, bottom: 8 }}>
              <Text style={{ color: '#fff', fontFamily: fonts.display, fontSize: 64, lineHeight: 62, fontVariant: ['tabular-nums'] }}>
                {stats.rate ?? '—'}
                <Text style={{ color: colors.secondary, fontSize: 24 }}>/100</Text>
              </Text>
              <View style={{ marginTop: 2, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.raised }}>
                <Text style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 }}>{stats.counted ? `${stats.present} of ${days(stats.counted)} present` : 'No days marked'}</Text>
              </View>
            </View>
          </View>
          <View className="flex-row justify-between" style={{ paddingHorizontal: 14 }}>
            <Text style={{ color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 }}>0</Text>
            <Text style={{ color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 }}>100</Text>
          </View>
          <View className="flex-row" style={{ marginTop: 8, gap: 8 }}>
            {counts.map((c) => (
              <View key={c.label} className="flex-1 flex-row items-center justify-center" style={{ gap: 6 }}>
                <View style={{ width: 9, height: 9, borderRadius: c.radius, backgroundColor: c.color }} />
                <Text style={{ color: colors.secondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>
                  {c.label} <Text style={{ color: '#fff', fontFamily: fonts.bold, fontVariant: ['tabular-nums'] }}>{c.value}</Text>
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className="flex-row" style={{ gap: 8 }}>
          <Streak title="Current streak" value={streakOf(statuses, realToday)} />
          <Streak title="Best streak" value={bestStreak(statuses)} />
        </View>
      </ScrollView>

      <Sheet visible={goalOpen} onClose={() => setGoalOpen(false)} title="Weekly goal">
        <View className="px-4 pb-2">
          <Text style={{ marginBottom: 12, color: colors.secondary, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 }}>How many days a week do you want to train?</Text>
          <View className="flex-row" style={{ gap: 6 }}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => {
              const selected = n === goal;
              return (
                <Pressable
                  key={n}
                  accessibilityRole="button"
                  accessibilityLabel={days(n)}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    haptic.tap();
                    actions.setPrefs({ weeklyGoalDays: n });
                    setGoalOpen(false);
                  }}
                  className="flex-1 items-center justify-center active:opacity-70"
                  style={{ height: 48, borderRadius: 12, backgroundColor: selected ? colors.accent : colors.fill }}
                >
                  <Text style={{ color: selected ? '#000' : '#fff', fontFamily: fonts.bold, fontSize: 17 }}>{n}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Sheet>
    </View>
  );
}
