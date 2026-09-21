import { useMemo, useRef, useState, type ReactNode } from 'react';
import { PanResponder, Platform, Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors, motion } from '../../theme';

const ACTION_WIDTH = 96;

interface Props {
  children: ReactNode;
  /** Called when the revealed Delete button is tapped. The caller should still ask "are you sure?". */
  onDelete: () => void;
  label: string;
}

/**
 * Swipe a card left to reveal a red Delete button behind it. Nothing is deleted by the swipe itself:
 * the button only asks the caller to start its confirmation. Vertical drags still scroll the page.
 */
export function SwipeToDelete({ children, onDelete, label }: Props) {
  const x = useSharedValue(0);
  const pos = useRef(0);
  const start = useRef(0);
  const [open, setOpen] = useState(false);

  const settle = (to: number) => {
    pos.current = to;
    x.value = withTiming(to, motion);
    setOpen(to !== 0);
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        // Only claim clearly horizontal drags so the ScrollView keeps vertical ones.
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          start.current = pos.current;
        },
        onPanResponderMove: (_, g) => {
          const next = Math.min(0, Math.max(-ACTION_WIDTH - 24, start.current + g.dx));
          pos.current = next;
          x.value = next;
        },
        onPanResponderRelease: (_, g) => settle(pos.current < -ACTION_WIDTH / 2 || g.vx < -0.6 ? -ACTION_WIDTH : 0),
        onPanResponderTerminate: () => settle(0),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  // The red button only exists once the card has moved, so it can't show through the rounded corners.
  const reveal = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, -x.value / 16)) }));

  return (
    <View
      className="overflow-hidden rounded-3xl"
      accessibilityActions={[{ name: 'delete', label: `Delete ${label}` }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'delete') onDelete();
      }}
    >
      <Animated.View
        style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, width: ACTION_WIDTH, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }, reveal]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${label}`}
          onPress={() => {
            settle(0);
            onDelete();
          }}
          className="h-full w-full items-center justify-center active:opacity-70"
        >
          <Text className="text-h2 text-white">Delete</Text>
        </Pressable>
      </Animated.View>

      <Animated.View {...pan.panHandlers} style={[slide, Platform.OS === 'web' ? ({ touchAction: 'pan-y' } as never) : null]}>
        {children}
        {/* While open, a tap on the card closes it again instead of doing nothing. */}
        {open ? (
          <Pressable accessibilityLabel="Close delete" onPress={() => settle(0)} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} />
        ) : null}
      </Animated.View>
    </View>
  );
}
