import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { WEEKDAY_LETTERS, headerDate, shortDate, weekStartKey, weekdayIndex } from '../lib/dates';
import { visibleDefaultDayLabels } from '../lib/daylabels';
import { WEEKLY_GOAL, streakWeeks, trainedDays } from '../lib/progress';
import { haptic } from '../lib/haptics';
import { useGym } from '../store/gym';
import { colors } from '../theme';
import type { Unit } from '../types';
import { ChevronDownIcon, PlusIcon, TrashIcon } from './Icons';
import { AddDayNameSheet } from './sheets/AddDayNameSheet';
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

/**
 * A day name in the picker (default or custom). Long-press arms a trash button in place of the
 * label (tap it to delete/hide, tap the label again to cancel) so a stray tap never removes one
 * by accident.
 */
function DayChip({
  label,
  selected,
  armed,
  onSelect,
  onArm,
  onDisarm,
  onDelete,
}: {
  label: string;
  selected: boolean;
  armed: boolean;
  onSelect: () => void;
  onArm: () => void;
  onDisarm: () => void;
  onDelete: () => void;
}) {
  if (armed) {
    return (
      <View className="h-11 flex-row items-center overflow-hidden rounded-full bg-fill">
        <Pressable accessibilityRole="button" accessibilityLabel={`Cancel deleting “${label}”`} onPress={onDisarm} className="h-11 justify-center pl-4 pr-2 active:opacity-70">
          <Text className="text-body text-muted" numberOfLines={1}>
            {label}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete “${label}”`}
          onPress={onDelete}
          className="h-11 items-center justify-center border-l pl-3 pr-4 active:opacity-70"
          style={{ borderLeftColor: colors.line }}
        >
          <TrashIcon size={16} color={colors.danger} />
        </Pressable>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      accessibilityHint="Double tap to select. Long-press to delete."
      onPress={onSelect}
      onLongPress={() => {
        haptic.tap();
        onArm();
      }}
      className={`h-11 items-center justify-center rounded-full px-4 active:opacity-70 ${selected ? 'bg-label' : 'bg-fill'}`}
    >
      <Text className={`text-body font-medium ${selected ? 'text-black' : 'text-label'}`} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Compact date · workout-day label · weekly streak. Tap the label to change day or units, "+" to name a new one. */
export function Header() {
  const { today, realToday, label, data, actions } = useGym();
  const [sheet, setSheet] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [armed, setArmed] = useState<string | null>(null);

  const start = weekStartKey(today);
  const days = useMemo(() => trainedDays(data.sessions, start), [data.sessions, start]);
  const streak = useMemo(() => streakWeeks(data.sessions, today), [data.sessions, today]);
  const visibleDefaults = useMemo(() => visibleDefaultDayLabels(data.hiddenDayLabels), [data.hiddenDayLabels]);

  const closeSheet = () => {
    setSheet(false);
    setArmed(null);
  };

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
      <View className="flex-1 pr-3">
        <Text className="text-caption uppercase tracking-wider text-muted/60">{headerDate(today)}</Text>
        <View className="flex-row items-center gap-1">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Workout day ${label}. Tap to change.`}
            onPress={() => {
              haptic.tap();
              setSheet(true);
            }}
            className="flex-row items-center gap-2 py-1 active:opacity-70"
          >
            <Text className="text-dayname text-label" numberOfLines={1}>
              {label}
            </Text>
            <ChevronDownIcon />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New workout day name"
            hitSlop={8}
            onPress={() => {
              haptic.tap();
              setAddOpen(true);
            }}
            className="h-8 w-8 items-center justify-center rounded-full active:opacity-70"
            style={{ backgroundColor: colors.fill }}
          >
            <PlusIcon size={15} color={colors.accent} stroke={2.6} />
          </Pressable>
        </View>
      </View>

      <View className="items-end pb-1.5">
        <WeekDots days={days} todayIdx={weekdayIndex(today)} />
        <Text className="mt-1 text-caption text-muted/60">
          {streak > 0 ? `${streak} week streak` : `Goal ${WEEKLY_GOAL} workouts/wk`}
        </Text>
      </View>

      <Sheet visible={sheet} onClose={closeSheet} title="Workout day">
        <View className="px-4 pb-2">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-caption uppercase tracking-wider text-muted/60">Defaults</Text>
            {data.hiddenDayLabels.length ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Restore defaults"
                accessibilityHint={`Brings back ${data.hiddenDayLabels.length} hidden default day name${data.hiddenDayLabels.length > 1 ? 's' : ''}`}
                onPress={() => {
                  haptic.tap();
                  actions.restoreDayLabels();
                  setArmed(null);
                }}
                className="active:opacity-60"
              >
                <Text className="text-caption font-semibold" style={{ color: colors.accent }}>
                  Restore defaults
                </Text>
              </Pressable>
            ) : null}
          </View>
          {visibleDefaults.length ? (
            <View className="flex-row flex-wrap gap-2">
              {visibleDefaults.map((l) => (
                <DayChip
                  key={l}
                  label={l}
                  selected={l === label}
                  armed={armed === l}
                  onSelect={() => {
                    haptic.tap();
                    actions.setLabel(l);
                    closeSheet();
                  }}
                  onArm={() => setArmed(l)}
                  onDisarm={() => setArmed(null)}
                  onDelete={() => {
                    haptic.tap();
                    actions.hideDayLabel(l);
                    setArmed(null);
                  }}
                />
              ))}
            </View>
          ) : (
            <Text className="text-body text-muted">All built-in names are hidden.</Text>
          )}

          {data.customDayLabels.length ? (
            <>
              <Text className="mb-2 mt-5 text-caption uppercase tracking-wider text-muted/60">Your names</Text>
              <View className="flex-row flex-wrap gap-2">
                {data.customDayLabels.map((l) => (
                  <DayChip
                    key={l}
                    label={l}
                    selected={l === label}
                    armed={armed === l}
                    onSelect={() => {
                      haptic.tap();
                      actions.setLabel(l);
                      closeSheet();
                    }}
                    onArm={() => setArmed(l)}
                    onDisarm={() => setArmed(null)}
                    onDelete={() => {
                      haptic.tap();
                      actions.deleteDayLabel(l);
                      setArmed(null);
                    }}
                  />
                ))}
              </View>
            </>
          ) : null}

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

      <AddDayNameSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        existing={data.customDayLabels}
        onSave={(name) => actions.addDayLabel(name)}
      />
    </View>
    </View>
  );
}
