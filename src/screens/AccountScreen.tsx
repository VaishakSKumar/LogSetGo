import type { ReactNode } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarCheckIcon, CameraIcon, ChevronRightIcon, PulseIcon } from '../components/Icons';
import { MonthlyCheckin } from '../components/session/MonthlyCheckin';
import { categoryMeta, categoryOf } from '../lib/body';
import { dayOfMonth, monthName, shiftMonth } from '../lib/calendar';
import { addDays } from '../lib/dates';
import { recentRate } from '../lib/insights';
import { monthPhoto } from '../lib/photoCheck';
import { fmtWeight, fmtWeightUnit } from '../lib/units';
import { useAttendance } from '../store/attendance';
import { useBody } from '../store/body';
import { useGym } from '../store/gym';
import { usePhotoUri, usePhotos } from '../store/photos';
import { useTimer } from '../store/timer';
import { colors, fonts } from '../theme';
import type { MonthlyPhoto } from '../types';
import { AttendanceStatsPage } from './account/AttendanceStatsPage';
import { BmiPage } from './account/BmiPage';
import { WeightProgressPage } from './account/WeightProgressPage';

export type AccountPage = 'bmi' | 'attendance' | 'weight' | 'checkin';

/** Room for the docked rest-timer banner when one is running. */
const TIMER_SPACE = 150;

function Thumb({ photo, month, current }: { photo: MonthlyPhoto | null; month: string; current: boolean }) {
  const uri = usePhotoUri(photo);
  return (
    <View className="flex-1">
      <View className="items-center justify-center overflow-hidden" style={{ height: 104, borderRadius: 12, backgroundColor: colors.fill, borderWidth: current ? 1.5 : 1, borderColor: current ? colors.accent : colors.border }}>
        {uri ? <Image accessibilityLabel={`${month} photo`} source={{ uri }} resizeMode="cover" style={{ width: '100%', height: '100%' }} /> : <Text style={{ color: colors.muted, fontFamily: fonts.medium, fontSize: 13 }}>No photo</Text>}
      </View>
      <Text className="text-center" style={{ marginTop: 4, color: colors.secondary, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 }}>
        {month}
      </Text>
    </View>
  );
}

function StatRow({ icon, title, detail, onPress }: { icon: ReactNode; title: string; detail: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      onPress={onPress}
      className="flex-row items-center active:opacity-70"
      style={{ minHeight: 68, paddingHorizontal: 12, paddingVertical: 10, gap: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel }}
    >
      <View className="items-center justify-center" style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.fill }}>
        {icon}
      </View>
      <View className="flex-1">
        <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 }}>{title}</Text>
        <Text style={{ color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 }}>{detail}</Text>
      </View>
      <ChevronRightIcon size={18} color={colors.muted} stroke={2.4} />
    </Pressable>
  );
}

function Home({ onOpen }: { onOpen: (page: AccountPage) => void }) {
  const { realToday, data } = useGym();
  const { statuses } = useAttendance();
  const { latest, bmi, entries, data: body } = useBody();
  const { photos } = usePhotos();
  const { timer } = useTimer();
  const insets = useSafeAreaInsets();
  const unit = data.unit;

  const thisMonth = photos ? monthPhoto(photos, realToday) : null;
  const months = [-2, -1, 0].map((n) => shiftMonth(realToday, n));
  const band = bmi == null ? null : categoryMeta(categoryOf(bmi));

  const rate = recentRate(statuses, realToday);
  const monthAgo = addDays(realToday, -30);
  const recent = entries.filter((e) => e.date >= monthAgo);
  const change = recent.length > 1 ? recent[0].kg - recent[recent.length - 1].kg : null;

  return (
    <ScrollView className="flex-1 bg-base" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: timer.status !== 'idle' ? TIMER_SPACE : 12, gap: 10 }}>
      <Text accessibilityRole="header" style={{ color: '#fff', fontFamily: fonts.display, fontSize: 44, lineHeight: 48 }}>
        Account
      </Text>

      {thisMonth ? (
        <View style={{ padding: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel }}>
          <View className="flex-row items-center justify-between" style={{ gap: 8 }}>
            <View className="shrink">
              <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 }}>Monthly check-in photo</Text>
              <Text style={{ color: colors.accent, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 }}>
                {monthName(realToday)} added on {dayOfMonth(thisMonth.date)} {monthName(thisMonth.date).slice(0, 3)}
              </Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Replace this month’s photo" onPress={() => onOpen('checkin')} className="justify-center active:opacity-60" style={{ height: 44, marginRight: -4, paddingHorizontal: 4 }}>
              <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 14, textDecorationLine: 'underline' }}>Replace</Text>
            </Pressable>
          </View>
          <View className="flex-row" style={{ marginTop: 8, gap: 8 }}>
            {months.map((m, i) => (
              <Thumb key={m} photo={photos ? monthPhoto(photos, m) : null} month={monthName(m).slice(0, 3)} current={i === 2} />
            ))}
          </View>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add monthly check-in photo. ${monthName(realToday)} not added yet`}
          onPress={() => onOpen('checkin')}
          className="flex-row items-center active:opacity-80"
          style={{ padding: 16, gap: 14, borderRadius: 20, backgroundColor: colors.accent }}
        >
          <View className="items-center justify-center" style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#000' }}>
            <CameraIcon size={26} color={colors.accent} />
          </View>
          <View className="flex-1">
            <Text style={{ color: '#000', fontFamily: fonts.display, fontSize: 30, lineHeight: 32 }}>Add monthly check-in photo</Text>
            <Text style={{ marginTop: 2, color: '#000', fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 }}>{monthName(realToday)} not added yet</Text>
          </View>
        </Pressable>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={bmi == null ? 'BMI. Add your weight and height' : `BMI ${bmi.toFixed(1)}, ${band!.label}. Open BMI`}
        onPress={() => onOpen('bmi')}
        className="active:opacity-70"
        style={{ padding: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel }}
      >
        <View className="flex-row items-center justify-between">
          <Text style={{ color: colors.secondary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 }}>BMI</Text>
          <ChevronRightIcon size={18} color={colors.muted} stroke={2.4} />
        </View>
        {bmi == null ? (
          <Text style={{ marginTop: 2, color: '#fff', fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 }}>Add your weight and height</Text>
        ) : (
          <View className="flex-row items-baseline" style={{ gap: 8 }}>
            <Text style={{ color: '#fff', fontFamily: fonts.display, fontSize: 48, lineHeight: 50, fontVariant: ['tabular-nums'] }}>{bmi.toFixed(1)}</Text>
            <Text style={{ color: band!.color, fontFamily: fonts.bold, fontSize: 15 }}>{band!.label}</Text>
            <Text className="flex-1 text-right" numberOfLines={1} style={{ color: colors.muted, fontFamily: fonts.medium, fontSize: 14, fontVariant: ['tabular-nums'] }}>
              {fmtWeightUnit(latest!.kg, unit)}
              {body.goalKg != null ? ` · Goal ${fmtWeight(body.goalKg, unit)} ${unit}` : ''}
            </Text>
          </View>
        )}
      </Pressable>

      <View style={{ gap: 8 }}>
        <Text accessibilityRole="header" style={{ marginTop: 2, color: colors.secondary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 }}>
          Stats
        </Text>
        <StatRow icon={<CalendarCheckIcon color={colors.accent} />} title="Gym Attendance stats" detail={rate == null ? 'No days marked yet' : `${rate}% in the last 30 days`} onPress={() => onOpen('attendance')} />
        <StatRow
          icon={<PulseIcon color={colors.accent} />}
          title="Weight Progress stat"
          detail={change == null ? 'Log your weight to see progress' : Math.abs(change) < 0.05 ? 'No change in 1 month' : `${change < 0 ? 'Down' : 'Up'} ${fmtWeightUnit(Math.abs(change), unit)} in 1 month`}
          onPress={() => onOpen('weight')}
        />
      </View>
    </ScrollView>
  );
}

/** Account tab: check-in photo, BMI and stats, with a page for each. There is no login until after the beta. */
export function AccountScreen({ page, onPage }: { page: AccountPage | null; onPage: (page: AccountPage | null) => void }) {
  const back = () => onPage(null);
  if (page === 'bmi') return <BmiPage onBack={back} onWeightProgress={() => onPage('weight')} />;
  if (page === 'attendance') return <AttendanceStatsPage onBack={back} />;
  if (page === 'weight') return <WeightProgressPage onBack={back} />;
  if (page === 'checkin') return <MonthlyCheckin intro="Track how you are changing." onSkip={back} onSaved={back} />;
  return <Home onOpen={onPage} />;
}
