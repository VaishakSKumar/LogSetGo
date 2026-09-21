import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, SlideOutLeft } from 'react-native-reanimated';

import { haptic } from '../../lib/haptics';
import type { LoggedExercise } from '../../lib/session';
import { fmtVolume, roundDisplay, toDisplay } from '../../lib/units';
import { colors, motion, roundedFont } from '../../theme';
import type { Exercise, Unit } from '../../types';
import { CheckIcon } from '../Icons';
import { SwipeToDelete } from './SwipeToDelete';

interface Props {
  entry: LoggedExercise;
  exercise: Pick<Exercise, 'name' | 'group'>;
  unit: Unit;
  /** "Last time · 3 days ago · 60 × 8 · 60 × 8", or null when there is no earlier session */
  previous: string | null;
  onMenu: () => void;
  onDelete: () => void;
}

const Head = ({ children, className = '' }: { children: string; className?: string }) => (
  <Text className={`text-caption uppercase tracking-wider text-muted/60 ${className}`}>{children}</Text>
);

const rounded = { fontFamily: roundedFont } as const;

/** One logged exercise: name, muscle badge, the completed sets, and a swipe-to-delete / ••• menu. */
export function ExerciseLogCard({ entry, exercise, unit, previous, onMenu, onDelete }: Props) {
  return (
    <Animated.View
      entering={FadeIn.duration(motion.duration)}
      exiting={SlideOutLeft.duration(200)}
      layout={LinearTransition.duration(motion.duration)}
    >
      <SwipeToDelete onDelete={onDelete} label={exercise.name}>
        <View className="border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 24 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center gap-2 pr-2">
              <Text className="shrink text-h2 text-label" numberOfLines={1}>
                {exercise.name}
              </Text>
              <View className="rounded-full bg-fill px-2 py-0.5">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-muted">{exercise.group}</Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`More options for ${exercise.name}`}
              hitSlop={8}
              onPress={() => {
                haptic.tap();
                onMenu();
              }}
              className="h-11 w-11 items-center justify-center rounded-full active:bg-fill"
            >
              <Text className="text-h2 text-muted" style={{ letterSpacing: 1 }}>
                •••
              </Text>
            </Pressable>
          </View>

          {previous ? (
            <Text className="mt-0.5 text-meta text-muted" numberOfLines={1}>
              {previous}
            </Text>
          ) : null}

          <View className="mb-1 mt-3 flex-row items-center px-1">
            <Head className="w-10">Set</Head>
            <Head className="flex-1 text-right">{unit}</Head>
            <Head className="w-16 text-right">Reps</Head>
            <View className="w-11" />
          </View>

          {entry.sets.map(({ row, number }) => (
            <View
              key={row.id}
              className="min-h-[40px] flex-row items-center px-1"
              style={{ borderTopWidth: 1, borderTopColor: colors.line }}
              accessible
              accessibilityLabel={`Set ${row.warmup ? 'warm-up' : number}: ${roundDisplay(toDisplay(row.weight ?? 0, unit))} ${unit} for ${row.reps} reps, completed${row.pr ? ', personal record' : ''}`}
            >
              <Text className="w-10 text-body tabular-nums" style={{ color: row.warmup ? colors.warn : colors.muted }}>
                {row.warmup ? 'W' : number}
              </Text>
              <Text className="flex-1 text-right text-body tabular-nums text-label" style={rounded}>
                {roundDisplay(toDisplay(row.weight ?? 0, unit))}
              </Text>
              <Text className="w-16 text-right text-body tabular-nums text-label" style={rounded}>
                {row.reps}
              </Text>
              <View className="w-11 items-end">
                <View className="h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: colors.accent }}>
                  <CheckIcon size={13} color="#000" stroke={3.4} />
                </View>
              </View>
            </View>
          ))}

          <Text className="mt-2 text-meta text-muted" accessibilityLabel={`Volume ${fmtVolume(entry.volume, unit)} ${unit}`}>
            Volume {fmtVolume(entry.volume, unit)} {unit}
            {entry.workingSets !== entry.sets.length ? ' · warm-ups not counted' : ''}
          </Text>
        </View>
      </SwipeToDelete>
    </Animated.View>
  );
}
