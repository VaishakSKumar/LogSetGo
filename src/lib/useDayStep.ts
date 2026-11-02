import { useGym } from '../store/gym';
import { addDays } from './dates';
import { haptic } from './haptics';
import { useSwipe } from './useSwipe';

/** Swipe handlers for Gym Progress: left is the next day, right the previous one. */
export function useDayStep() {
  const { today, actions } = useGym();
  return useSwipe((direction) => {
    haptic.tap();
    actions.setWorkDate(addDays(today, direction));
  });
}
