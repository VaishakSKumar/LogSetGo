import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';

/**
 * Phone-level alerts: a buzz when a rest ends (even with the app closed) and an optional daily
 * "time to train" reminder. Only the iOS and Android apps can do this; the web version can't
 * deliver notifications while it is closed, so everything here is a safe no-op there.
 */
export const notificationsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

const REST_ID = 'rest-timer';
const REMINDER_ID = 'daily-reminder';

let configured = false;
async function configure() {
  if (configured || !notificationsSupported) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      // In the app the on-screen banner and haptic already tell you, so don't double up.
      const inApp = n.request.content.data?.kind === 'rest' && AppState.currentState === 'active';
      return { shouldShowBanner: !inApp, shouldShowList: !inApp, shouldPlaySound: !inApp, shouldSetBadge: false };
    },
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('rest-timer', {
      name: 'Rest timer',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 120, 250],
      lightColor: '#30D158',
    });
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Workout reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

/** Asks for permission if needed. Returns whether alerts are allowed. */
export async function ensurePermission(): Promise<boolean> {
  if (!notificationsSupported) return false;
  try {
    await configure();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Schedules (replacing any earlier one) a rest-over alert `seconds` from now. */
export async function scheduleRestAlert(seconds: number, label?: string | null) {
  if (!notificationsSupported) return;
  try {
    await configure();
    await Notifications.scheduleNotificationAsync({
      identifier: REST_ID,
      content: {
        title: 'Rest over',
        body: label ? `${label}: back to the bar.` : 'Time for your next set.',
        data: { kind: 'rest' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
        channelId: 'rest-timer',
      },
    });
  } catch {
    /* alerts are a nicety: never break the timer over them */
  }
}

/**
 * Fires a real alert through the same path as a rest-over one (same channel, same timed trigger)
 * `seconds` from now, so a phone that stays silent can be diagnosed without doing a workout.
 * Unlike the rest alert it also shows while the app is open.
 */
export async function sendTestAlert(seconds = 5): Promise<'sent' | 'blocked' | 'failed'> {
  if (!notificationsSupported) return 'failed';
  if (!(await ensurePermission())) return 'blocked';
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: 'test-alert',
      content: { title: 'Test alert', body: 'LogSetGo can notify you. Rest-over alerts will arrive like this.', data: { kind: 'test' }, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, channelId: 'rest-timer' },
    });
    return 'sent';
  } catch {
    return 'failed';
  }
}

export async function cancelRestAlert() {
  if (!notificationsSupported) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(REST_ID);
  } catch {
    /* nothing scheduled */
  }
}

/** Repeats every day at `hour`:00. Passing null removes it. */
export async function setDailyReminder(hour: number | null) {
  if (!notificationsSupported) return;
  try {
    await configure();
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
    if (hour == null) return;
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: { title: 'Time to train', body: 'Log today in LogSetGo. Track. Rest. Progress.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute: 0, channelId: 'reminders' },
    });
  } catch {
    /* ignore */
  }
}
