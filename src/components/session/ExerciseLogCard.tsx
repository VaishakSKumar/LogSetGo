import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, SlideOutLeft } from 'react-native-reanimated';

import { formatDuration } from '../../lib/duration';
import { haptic } from '../../lib/haptics';
import { exerciseReps, type LoggedExercise } from '../../lib/session';
import { fmtVolume, roundDisplay, toDisplay } from '../../lib/units';
import { colors, fonts, motion } from '../../theme';
import type { Exercise, SetRow as SetRowData, Unit } from '../../types';
import { DotsIcon } from '../Icons';
import { SwipeToDelete } from './SwipeToDelete';

interface Props {
  entry: LoggedExercise;
  exercise: Pick<Exercise, 'name' | 'group'>;
  unit: Unit;
  onMenu: () => void;
  onDelete: () => void;
  /** A past day's activity log: no ••• menu and no swipe-to-delete, just what was logged. */
  readOnly?: boolean;
}

/** One logged exercise: name, muscle group, a chip per completed set, and (unless read-only) a swipe-to-delete / ••• menu. */
export function ExerciseLogCard({ entry, exercise, unit, onMenu, onDelete, readOnly }: Props) {
  const noKg = entry.sets.every(({ row }) => !row.weight);
  const totalReps = exerciseReps(entry.sets.map(({ row }) => row));
  const warmups = entry.workingSets !== entry.sets.length ? ' · warm-ups not counted' : '';
  const chipText = (row: SetRowData) => {
    const value = (row.mode ?? 'reps') === 'time' ? formatDuration(row.reps ?? 0) : String(row.reps);
    return row.weight ? `${roundDisplay(toDisplay(row.weight, unit))} × ${value}` : value;
  };
  const card = (
    <View style={{ paddingVertical: 12, paddingLeft: 14, paddingRight: 8, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel }}>
      <View className="flex-row items-center" style={{ gap: 8 }}>
        <Text className="shrink" style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 }} numberOfLines={1}>
          {exercise.name}
        </Text>
        <Text style={{ color: colors.muted, fontFamily: fonts.semibold, fontSize: 12 }}>{exercise.group}</Text>
        {readOnly ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`More options for ${exercise.name}`}
            hitSlop={8}
            onPress={() => {
              haptic.tap();
              onMenu();
            }}
            className="items-center justify-center active:opacity-60"
            style={{ width: 44, height: 32, marginLeft: 'auto' }}
          >
            <DotsIcon />
          </Pressable>
        )}
      </View>

      <View className="flex-row flex-wrap" style={{ marginTop: 8, gap: 6 }}>
        {entry.sets.map(({ row, number }) => {
          const isTime = (row.mode ?? 'reps') === 'time';
          return (
            <View
              key={row.id}
              accessible
              accessibilityLabel={`Set ${row.warmup ? 'warm-up' : number}: ${roundDisplay(toDisplay(row.weight ?? 0, unit))} ${unit}${isTime ? ` for ${formatDuration(row.reps ?? 0)}` : ` for ${row.reps} reps`}, completed${row.pr ? ', personal record' : ''}`}
              className="flex-row items-center"
              style={{ height: 30, paddingHorizontal: 9, gap: 5, borderRadius: 9, backgroundColor: colors.fill }}
            >
              {row.warmup ? <Text style={{ color: colors.warn, fontFamily: fonts.bold, fontSize: 12 }}>W</Text> : null}
              <Text style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 14, fontVariant: ['tabular-nums'] }}>{chipText(row)}</Text>
              {row.pr ? (
                <View style={{ paddingHorizontal: 4, borderRadius: 4, backgroundColor: colors.accent }}>
                  <Text style={{ color: '#000', fontFamily: fonts.bold, fontSize: 11, lineHeight: 16 }}>PR</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {entry.mode === 'time' ? (
        <Text className="mt-2 text-meta text-muted" accessibilityLabel={`Time under tension ${formatDuration(entry.tutSeconds)}`}>
          Time under tension {formatDuration(entry.tutSeconds)}
          {warmups}
        </Text>
      ) : noKg ? (
        <Text className="mt-2 text-meta text-muted" accessibilityLabel={`Total reps ${totalReps}`}>
          Total reps {totalReps}
          {warmups}
        </Text>
      ) : (
        <Text className="mt-2 text-meta text-muted" accessibilityLabel={`Volume ${fmtVolume(entry.volume, unit)} ${unit}`}>
          Volume {fmtVolume(entry.volume, unit)} {unit}
          {warmups}
        </Text>
      )}
    </View>
  );

  return (
    <Animated.View
      entering={FadeIn.duration(motion.duration)}
      exiting={SlideOutLeft.duration(200)}
      layout={LinearTransition.duration(motion.duration)}
    >
      {readOnly ? card : (
        <SwipeToDelete onDelete={onDelete} label={exercise.name}>
          {card}
        </SwipeToDelete>
      )}
    </Animated.View>
  );
}
