import { useMemo, useRef } from 'react';
import { PanResponder } from 'react-native';

/** How far a finger must travel sideways before a swipe counts. */
const SWIPE_DISTANCE = 60;

/** Handlers for a horizontal swipe. `onSwipe(1)` is a swipe left (next), `onSwipe(-1)` a swipe right (previous). */
export function useSwipe(onSwipe: (direction: 1 | -1) => void) {
  const latest = useRef(onSwipe);
  latest.current = onSwipe;

  return useMemo(
    () =>
      PanResponder.create({
        // Claim only a clearly sideways drag, so vertical scrolling and taps are left alone.
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 16 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) >= SWIPE_DISTANCE && Math.abs(g.dx) > Math.abs(g.dy)) latest.current(g.dx < 0 ? 1 : -1);
        },
      }).panHandlers,
    [],
  );
}
