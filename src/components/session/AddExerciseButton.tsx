import { useEffect } from 'react';
import { Pressable, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { motion } from '../../theme';
import { PlusIcon } from '../Icons';

/**
 * The "+" pill at the end of the logged feed. Opening it turns the plus 45° into an ×
 * (it is the close button while the entry panel is open) and flips green → white.
 */
export function AddExerciseButton({ open, onPress }: { open: boolean; onPress: () => void }) {
  const turn = useSharedValue(open ? 1 : 0);

  useEffect(() => {
    turn.value = withTiming(open ? 1 : 0, motion);
  }, [open, turn]);

  const icon = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 45}deg` }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={open ? 'Close new exercise' : 'Add exercise'}
      accessibilityState={{ expanded: open }}
      onPress={onPress}
      className={`h-12 flex-row items-center justify-center gap-2 self-center rounded-full px-6 active:opacity-80 ${open ? 'bg-label' : 'bg-accent'}`}
    >
      <Animated.View style={icon}>
        <PlusIcon size={20} color="#000" stroke={3} />
      </Animated.View>
      <Text className="text-h2 text-black">{open ? 'Close' : 'Add exercise'}</Text>
    </Pressable>
  );
}
