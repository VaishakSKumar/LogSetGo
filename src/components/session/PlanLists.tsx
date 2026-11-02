import { Pressable, Text, View } from 'react-native';

import { haptic } from '../../lib/haptics';
import { exerciseCount, planDetail } from '../../lib/plans';
import { useGym } from '../../store/gym';
import { colors, fonts } from '../../theme';

const title = { color: colors.secondary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 };

/** Saved plans. Tapping one loads it into today: reps filled in, nothing counted until a set is ticked. */
export function YourPlans() {
  const { data, actions } = useGym();
  if (!data.routines.length) return null;
  return (
    <View style={{ marginTop: 14 }}>
      <Text accessibilityRole="header" style={[title, { marginBottom: 6 }]}>
        Your plans
      </Text>
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {data.routines.map((plan) => (
          <Pressable
            key={plan.id}
            accessibilityRole="button"
            accessibilityLabel={`Start ${plan.name}, ${exerciseCount(plan.items.length)}`}
            onPress={() => {
              haptic.tap();
              actions.startRoutine(plan);
            }}
            className="justify-center active:opacity-70"
            style={{ width: '48.5%', height: 60, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel }}
          >
            <Text numberOfLines={1} style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 }}>
              {plan.name}
            </Text>
            <Text style={{ color: colors.muted, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 }}>{exerciseCount(plan.items.length)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Exercises loaded from a plan with nothing ticked yet, so closing the entry panel never loses them. */
export function TodaysPlan({ date }: { date: string }) {
  const { data, byId, actions } = useGym();
  const session = data.sessions[date];
  const waiting = Object.entries(session?.exercises ?? {}).filter(([, rows]) => rows.length && !rows.some((r) => r.done));
  if (!waiting.length) return null;
  return (
    <View style={{ marginTop: 14 }}>
      <Text accessibilityRole="header" style={title}>
        To do today
      </Text>
      {waiting.map(([id, rows]) => {
        const name = byId.get(id)?.name ?? id;
        const detail = planDetail(rows.length, rows[0].reps);
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={`${name}, ${detail}`}
            onPress={() => {
              haptic.tap();
              actions.selectExercise(id);
            }}
            className="flex-row items-center justify-between active:opacity-60"
            style={{ height: 52, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.navLine }}
          >
            <Text className="shrink" numberOfLines={1} style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 16 }}>
              {name}
            </Text>
            <Text style={{ color: colors.muted, fontFamily: fonts.medium, fontSize: 14, fontVariant: ['tabular-nums'] }}>{detail}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
