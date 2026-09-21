import { useMemo } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';

import { haptic } from '../lib/haptics';
import { browseExercises } from '../lib/suggest';
import { useGym } from '../store/gym';
import type { Exercise } from '../types';

/** One-tap switching: what you've done today first, then your usual lifts for this day. */
export function ExerciseChips() {
  const { exercises, recents, label, today, data, byId, active, actions } = useGym();

  const chips = useMemo(() => {
    const session = data.sessions[today];
    const fromToday = session
      ? Object.entries(session.exercises)
          .filter(([, rows]) => rows.length > 0)
          .map(([id]) => byId.get(id))
          .filter((e): e is Exercise => !!e)
      : [];
    const { recent, suggested } = browseExercises(exercises, recents, label);
    const seen = new Set<string>();
    return [...fromToday, ...(active ? [active] : []), ...recent, ...suggested]
      .filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)))
      .slice(0, 10);
  }, [data.sessions, today, byId, exercises, recents, label, active]);

  if (!chips.length) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" className="-mx-4" contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
      {chips.map((ex) => {
        const selected = ex.id === active?.id;
        const todayRows = data.sessions[today]?.exercises[ex.id] ?? [];
        const done = todayRows.filter((r) => r.done).length;
        const count = todayRows.length > done && done > 0 ? `${done}/${todayRows.length}` : done > 0 ? String(done) : null;
        return (
          <Pressable
            key={ex.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
              haptic.tap();
              actions.selectExercise(ex.id);
            }}
            className={`h-11 flex-row items-center justify-center gap-2 rounded-full px-4 active:opacity-70 ${selected ? 'bg-label' : 'bg-fill'}`}
          >
            <Text className={`text-body font-medium ${selected ? 'text-black' : 'text-label'}`} numberOfLines={1}>
              {ex.name}
            </Text>
            {count ? <Text className={`text-caption tabular-nums ${selected ? 'text-black/60' : 'text-muted'}`}>{count}</Text> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
