import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { haptic } from '../../lib/haptics';
import {
  PLAN_GOALS,
  PLAN_LEVELS,
  buildPlan,
  planSummary,
  type PlanDays,
  type PlanGoal,
  type PlanLevel,
} from '../../lib/routines';
import { useGym } from '../../store/gym';
import { colors } from '../../theme';
import type { Routine } from '../../types';
import { CloseIcon, PlayIcon } from '../Icons';
import { Sheet, SheetBody } from '../Sheet';
import { Caption, PillButton } from '../ui';

const Chip = ({ label, selected, onPress, sub }: { label: string; selected: boolean; onPress: () => void; sub?: string }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected }}
    onPress={onPress}
    className={`min-h-[44px] items-center justify-center rounded-2xl px-4 py-2 active:opacity-70 ${selected ? 'bg-label' : 'bg-fill'}`}
  >
    <Text className={`text-body font-medium ${selected ? 'text-black' : 'text-label'}`}>{label}</Text>
    {sub ? <Text className={`text-caption ${selected ? 'text-black/60' : 'text-muted'}`}>{sub}</Text> : null}
  </Pressable>
);

function describe(r: Routine, names: (id: string) => string) {
  return r.items
    .slice(0, 4)
    .map((i) => `${names(i.exerciseId)} ${i.sets}${i.reps ? `×${i.reps}` : ''}`)
    .join(' · ') + (r.items.length > 4 ? ` · +${r.items.length - 4} more` : '');
}

/** Saved workouts you can start in one tap, plus a plan builder that lays out a whole week for you. */
export function RoutinesSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { data, byId, actions } = useGym();
  const [mode, setMode] = useState<'list' | 'build'>('list');
  const [goal, setGoal] = useState<PlanGoal>('muscle');
  const [days, setDays] = useState<PlanDays>(4);
  const [level, setLevel] = useState<PlanLevel>('intermediate');
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const name = (id: string) => byId.get(id)?.name ?? id;
  const plan = useMemo(() => buildPlan({ goal, days, level }), [goal, days, level]);

  const close = () => {
    setMode('list');
    setSavedCount(null);
    onClose();
  };

  const start = (r: Routine) => {
    haptic.pulse();
    actions.startRoutine(r);
    close();
  };

  const savePlan = () => {
    plan.forEach((r) => actions.addRoutine(r));
    haptic.pulse();
    setSavedCount(plan.length);
    setMode('list');
  };

  return (
    <Sheet visible={visible} onClose={close} title={mode === 'build' ? 'Plan builder' : 'Routines'}>
      <SheetBody>
        {mode === 'list' ? (
          <>
            {savedCount ? <Text className="mb-2 text-body" style={{ color: colors.accent }}>Saved {savedCount} routines from your plan.</Text> : null}
            {data.routines.length === 0 ? (
              <Text className="py-2 text-body text-muted">
                No routines yet. Build a weekly plan below, or finish a workout and tap “Save as routine” in its summary.
              </Text>
            ) : (
              data.routines.map((r, i) => (
                <View key={r.id} className="min-h-[72px] flex-row items-center py-2" style={i ? { borderTopWidth: 1, borderTopColor: colors.line } : undefined}>
                  <View className="flex-1 pr-2">
                    <Text className="text-h2 text-label" numberOfLines={1}>
                      {r.name}
                    </Text>
                    <Caption>{describe(r, name)}</Caption>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Start ${r.name}`}
                    onPress={() => start(r)}
                    className="h-11 w-11 items-center justify-center rounded-full bg-fill active:opacity-60"
                  >
                    <PlayIcon size={16} color={colors.accent} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${r.name}`}
                    onPress={() => {
                      haptic.tap();
                      actions.deleteRoutine(r.id);
                    }}
                    className="h-11 w-11 items-center justify-center active:opacity-60"
                  >
                    <CloseIcon size={16} color={colors.danger} />
                  </Pressable>
                </View>
              ))
            )}
            <View className="mt-3">
              <PillButton variant="white" label="Build a weekly plan" onPress={() => setMode('build')} />
            </View>
          </>
        ) : (
          <>
            <Caption className="mb-3">Pick your goal, days and level. The builder lays out a proven split with sensible sets and reps. It runs offline and uses fixed rules, not AI.</Caption>

            <Text className="mb-2 text-body text-muted">Goal</Text>
            <View className="mb-4 gap-2">
              {PLAN_GOALS.map((g) => (
                <Chip key={g.key} label={g.label} sub={g.blurb} selected={goal === g.key} onPress={() => setGoal(g.key)} />
              ))}
            </View>

            <Text className="mb-2 text-body text-muted">Days per week</Text>
            <View className="mb-4 flex-row gap-2">
              {([2, 3, 4, 5, 6] as PlanDays[]).map((d) => (
                <View key={d} className="flex-1">
                  <Chip label={String(d)} selected={days === d} onPress={() => setDays(d)} />
                </View>
              ))}
            </View>

            <Text className="mb-2 text-body text-muted">Level</Text>
            <View className="mb-4 flex-row gap-2">
              {PLAN_LEVELS.map((l) => (
                <View key={l.key} className="flex-1">
                  <Chip label={l.label} selected={level === l.key} onPress={() => setLevel(l.key)} />
                </View>
              ))}
            </View>

            <View className="rounded-2xl bg-fill/40 p-3">
              <Text className="mb-1 text-body text-label">Your plan</Text>
              <Caption className="mb-2">{planSummary({ goal, days, level })}</Caption>
              {plan.map((r) => (
                <View key={r.id} className="py-1.5">
                  <Text className="text-body font-semibold text-label">{r.name}</Text>
                  <Caption>{describe(r, name)}</Caption>
                </View>
              ))}
            </View>

            <View className="mt-3 flex-row gap-2">
              <View className="flex-1">
                <PillButton label="Back" onPress={() => setMode('list')} />
              </View>
              <View className="flex-[2]">
                <PillButton variant="primary" label={`Save ${plan.length} routines`} onPress={savePlan} />
              </View>
            </View>
          </>
        )}
      </SheetBody>
    </Sheet>
  );
}
