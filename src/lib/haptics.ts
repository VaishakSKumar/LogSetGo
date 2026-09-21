import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

const run = (fn: () => Promise<void>) => {
  if (Platform.OS === 'web') return;
  fn().catch(() => {});
};

export const haptic = {
  /** selection change, steppers, picking a suggestion */
  tap: () => run(() => Haptics.selectionAsync()),
  /** logging an attendance status: a lighter pulse than a set log */
  pulse: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** logging a set */
  log: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** new personal record */
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** can't log yet */
  warn: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  /** rest timer hit 0:00 — deliberately stronger than a set log so it's felt through a pocket or a glove */
  timerDone: () => {
    run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    setTimeout(() => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)), 220);
    if (Platform.OS === 'android') {
      try {
        Vibration.vibrate([0, 250, 120, 250]);
      } catch {
        /* vibration unavailable */
      }
    }
  },
};
