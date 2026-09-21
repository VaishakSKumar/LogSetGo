import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { WEEKDAY_LETTERS, headerDate, shortDate, weekStartKey, weekdayIndex } from '../lib/dates';
import { DAY_LABELS, WEEKLY_GOAL, streakWeeks, trainedDays } from '../lib/progress';
import { haptic } from '../lib/haptics';
import { useGym } from '../store/gym';
import { colors } from '../theme';
import type { Unit } from '../types';
import { ChevronDownIcon } from './Icons';
import { Sheet } from './Sheet';

function WeekDots({ days, todayIdx }: { days: boolean[]; todayIdx: number }) {
  return (
    <View className="flex-row gap-1.5" accessibilityLabel={`${days.filter(Boolean).length} workouts this week`}>
      {days.map((trained, i) => (
        <View key={i} className="items-center gap-1">
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: trained ? colors.accent : 'transparent',
              borderWidth: trained ? 0 : 1.5,
              borderColor: i === todayIdx ? colors.label : colors.outline,
            }}
          />
          <Text className="text-[9px] text-muted/50">{WEEKDAY_LETTERS[i]}</Text>
        </View>
      ))}
    </View>
  );
}

const Chip = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected }}
    onPress={onPress}
    className={`h-11 items-center justify-center rounded-full px-4 active:opacity-70 ${selected ? 'bg-label' : 'bg-fill'}`}
  >
    <Text className={`text-body font-medium ${selected ? 'text-black' : 'text-label'}`}>{label}</Text>
  </Pressable>
);

/** Compact date · workout-day label · weekly streak. Tap the label to change day or units. */
export function Header() {
  const { today, realToday, label, data, actions } = useGym();
  const [sheet, setSheet] = useState(false);

  const start = weekStartKey(today);
  const days = useMemo(() => trainedDays(data.sessions, start), [data.sessions, start]);
  const streak = useMemo(() => streakWeeks(data.sessions, today), [data.sessions, today]);

  return (
    <View>
      {today !== realToday ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Logging ${shortDate(today)}. Jump to today.`}
          onPress={() => {
            haptic.tap();
            actions.setWorkDate(null);
          }}
          className="mb-2 h-11 flex-row items-center gap-2 self-start rounded-full bg-fill px-4 active:opacity-70"
        >
          <Text className="text-body text-muted">Logging {shortDate(today)}</Text>
          <Text className="text-body font-semibold text-label">Jump to today</Text>
        </Pressable>
      ) : null}
    <View className="flex-row items-end justify-between">
      <View>
        <Text className="text-caption uppercase tracking-wider text-muted/60">{headerDate(today)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Workout day ${label}. Tap to change.`}
          onPress={() => setSheet(true)}
          className="flex-row items-center gap-2 py-1 active:opacity-70"
        >
          <Text className="text-h1 text-label">{label}</Text>
          <ChevronDownIcon />
        </Pressable>
      </View>

      <View className="items-end pb-1.5">
        <WeekDots days={days} todayIdx={weekdayIndex(today)} />
        <Text className="mt-1 text-caption text-muted/60">
          {streak > 0 ? `${streak} week streak` : `Goal ${WEEKLY_GOAL} workouts/wk`}
        </Text>
      </View>

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Workout day">
        <View className="px-4 pb-2">
          <View className="flex-row flex-wrap gap-2">
            {DAY_LABELS.map((l) => (
              <Chip
                key={l}
                label={l}
                selected={l === label}
                onPress={() => {
                  haptic.tap();
                  actions.setLabel(l);
                  setSheet(false);
                }}
              />
            ))}
          </View>

          <Text className="mb-2 mt-6 text-h2 text-label">Units</Text>
          <View className="flex-row gap-2">
            {(['kg', 'lb'] as Unit[]).map((u) => (
              <Chip
                key={u}
                label={u}
                selected={data.unit === u}
                onPress={() => {
                  haptic.tap();
                  actions.setUnit(u);
                }}
              />
            ))}
          </View>
          <Text className="mt-2 text-caption text-muted/60">Everything is stored in kg, so switching never changes your history.</Text>
        </View>
      </Sheet>
    </View>
    </View>
  );
}
