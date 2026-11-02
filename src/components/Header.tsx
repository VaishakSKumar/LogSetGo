import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { compactDate } from '../lib/calendar';
import { addDays, shortDate } from '../lib/dates';
import { visibleDefaultDayLabels } from '../lib/daylabels';
import { haptic } from '../lib/haptics';
import { useGym } from '../store/gym';
import { colors, fonts } from '../theme';
import type { Unit } from '../types';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, TrashIcon } from './Icons';
import { CalendarSheet } from './attendance/CalendarSheet';
import { PlanFlow } from './plans/PlanFlow';
import { AddDayNameSheet } from './sheets/AddDayNameSheet';
import { Sheet } from './Sheet';

/** One Android modal has to finish closing before the next can open. */
const SHEET_SETTLE_MS = 320;

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

/**
 * Date with ‹ › arrows (tap it for the calendar) and, on the right, the workout-day name while on
 * today or a way back to today from anywhere else. `ink` recolours it for the full-colour day pages;
 * `locked` drops the workout-day name, since those pages have nothing to name.
 */
export function Header({ ink = '#fff', locked = false }: { ink?: string; locked?: boolean }) {
  const { today, realToday, label, data, actions } = useGym();
  const [sheet, setSheet] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [armed, setArmed] = useState<string | null>(null);

  const visibleDefaults = useMemo(() => visibleDefaultDayLabels(data.hiddenDayLabels), [data.hiddenDayLabels]);

  const closeSheet = () => {
    setSheet(false);
    setArmed(null);
  };

  const step = (n: number) => {
    haptic.tap();
    actions.setWorkDate(addDays(today, n));
  };

  const textStyle = { color: ink, fontFamily: fonts.bold, fontSize: 15 };

  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center" style={{ marginLeft: -10 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous day" onPress={() => step(-1)} className="items-center justify-center active:opacity-60" style={{ width: 44, height: 44 }}>
          <ChevronLeftIcon size={20} color={ink} stroke={2.4} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${compactDate(today)}. Open calendar`}
          onPress={() => {
            haptic.tap();
            setCalendarOpen(true);
          }}
          className="flex-row items-center active:opacity-60"
          style={{ height: 44, paddingHorizontal: 2, gap: 3 }}
        >
          <Text style={textStyle}>{compactDate(today)}</Text>
          <ChevronDownIcon size={16} color={ink} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Next day" onPress={() => step(1)} className="items-center justify-center active:opacity-60" style={{ width: 44, height: 44 }}>
          <ChevronRightIcon size={20} color={ink} stroke={2.4} />
        </Pressable>
      </View>

      {today !== realToday ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Logging ${shortDate(today)}. Jump to today.`}
          onPress={() => {
            haptic.tap();
            actions.setWorkDate(null);
          }}
          className="justify-center active:opacity-60"
          style={{ height: 44, marginRight: -6, paddingHorizontal: 6 }}
        >
          <Text style={[textStyle, ink === '#fff' ? { color: colors.accent } : null]}>Today</Text>
        </Pressable>
      ) : locked ? null : (
        <View className="flex-row items-center" style={{ flexShrink: 1, gap: 2, marginRight: -6 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Workout day ${label}. Tap to change.`}
            onPress={() => {
              haptic.tap();
              setSheet(true);
            }}
            className="shrink flex-row items-center active:opacity-70"
            style={{ height: 44, paddingHorizontal: 6, gap: 4 }}
          >
            <Text style={[textStyle, { flexShrink: 1 }]} numberOfLines={1}>
              {label}
            </Text>
            <ChevronDownIcon size={18} color={ink} stroke={2.4} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New workout plan"
            onPress={() => {
              haptic.tap();
              setPlanOpen(true);
            }}
            className="items-center justify-center active:opacity-70"
            style={{ width: 44, height: 44, marginRight: -4 }}
          >
            <PlusIcon size={22} color={ink === '#fff' ? colors.accent : ink} stroke={2.6} />
          </Pressable>
        </View>
      )}

      <CalendarSheet visible={calendarOpen} date={today} onClose={() => setCalendarOpen(false)} onPickDate={(d) => actions.setWorkDate(d === realToday ? null : d)} />

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

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New workout day name"
            onPress={() => {
              haptic.tap();
              closeSheet();
              setTimeout(() => setAddOpen(true), SHEET_SETTLE_MS);
            }}
            className="mt-3 h-11 flex-row items-center self-start active:opacity-60"
            style={{ gap: 6 }}
          >
            <PlusIcon size={16} color={colors.accent} stroke={2.6} />
            <Text className="text-body" style={{ color: colors.accent, fontFamily: fonts.semibold }}>
              New day name
            </Text>
          </Pressable>

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

      <PlanFlow visible={planOpen} onClose={() => setPlanOpen(false)} />

      <AddDayNameSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        existing={data.customDayLabels}
        onSave={(name) => actions.addDayLabel(name)}
      />
    </View>
  );
}
