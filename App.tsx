import './global.css';

import { Barlow_400Regular } from '@expo-google-fonts/barlow/400Regular';
import { Barlow_500Medium } from '@expo-google-fonts/barlow/500Medium';
import { Barlow_600SemiBold } from '@expo-google-fonts/barlow/600SemiBold';
import { Barlow_700Bold } from '@expo-google-fonts/barlow/700Bold';
import { BarlowCondensed_600SemiBold } from '@expo-google-fonts/barlow-condensed/600SemiBold';
import { BarlowCondensed_800ExtraBold } from '@expo-google-fonts/barlow-condensed/800ExtraBold';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BottomTabBar, type TabKey } from './src/components/BottomTabBar';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { PresenceGate } from './src/components/PresenceGate';
import { RestBanner } from './src/components/RestBanner';
import { MonthlyPhotoGate } from './src/components/session/MonthlyPhotoGate';
import { canLog } from './src/lib/attendance';
import { SettingsSheet } from './src/components/sheets/SettingsSheet';
import { AccountScreen, type AccountPage } from './src/screens/AccountScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { WorkoutScreen } from './src/screens/WorkoutScreen';
import { AttendanceProvider, useAttendance } from './src/store/attendance';
import { BodyProvider, useBody } from './src/store/body';
import { GymProvider, useGym } from './src/store/gym';
import { PhotosProvider } from './src/store/photos';
import { TimerProvider, useTimer } from './src/store/timer';
import { installGlobalHandlers } from './src/lib/diagnostics';
import { registerServiceWorker } from './src/lib/pwa';
import { colors, motion } from './src/theme';

/**
 * One tab's content. It mounts the first time you open it and then stays mounted (hidden),
 * so scroll position, the calendar month and an open search all survive tab switches.
 */
function Pane({ active, visited, children }: { active: boolean; visited: boolean; children: ReactNode }) {
  const enter = useSharedValue(1);

  useEffect(() => {
    if (!active) return;
    enter.value = 0;
    enter.value = withTiming(1, motion);
  }, [active, enter]);

  const style = useAnimatedStyle(() => ({ opacity: enter.value, transform: [{ translateY: (1 - enter.value) * 8 }] }));

  if (!visited) return null;
  return (
    <Animated.View
      pointerEvents={active ? 'auto' : 'none'}
      style={[StyleSheet.absoluteFill, { display: active ? 'flex' : 'none' }, style]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * App shell: three panes + the bottom tab bar.
 *  · Attendance: calendar, P / A / H, showing-up stats. "Present" hops to Gym Progress for that date.
 *  · Gym Progress: exercise logger, set/rep counter, autofill box, rest timer.
 *  · Account: monthly check-in photo, BMI and goal weight, attendance and weight stats.
 */
function Root() {
  const { ready: gymReady, actions, today } = useGym();
  const { ready: attendanceReady, statuses } = useAttendance();
  const { ready: bodyReady } = useBody();
  const { timer } = useTimer();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>('attendance');
  const [visited, setVisited] = useState<Record<TabKey, boolean>>({ attendance: true, gym: false, account: false });
  const [accountPage, setAccountPage] = useState<AccountPage | null>(null);

  const goTo = useCallback((next: TabKey) => {
    setVisited((v) => (v[next] ? v : { ...v, [next]: true }));
    setTab(next);
    // The Account tab always opens on Account itself.
    if (next === 'account') setAccountPage(null);
  }, []);

  /** Daily flow: choosing Present on the calendar points the logger at that date and opens it. */
  const openWorkout = useCallback(
    (date: string) => {
      actions.setWorkDate(date);
      goTo('gym');
    },
    [actions, goTo],
  );

  // Android hardware back: an Account page returns to Account, any tab to Attendance, then the app closes.
  useEffect(() => {
    if (tab === 'attendance') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (tab === 'account' && accountPage) setAccountPage(null);
      else setTab('attendance');
      return true;
    });
    return () => sub.remove();
  }, [tab, accountPage]);

  if (!gymReady || !attendanceReady || !bodyReady) return <View className="flex-1 bg-base" />;

  return (
    <View className="flex-1 bg-base">
      <View className="flex-1">
        <Pane active={tab === 'attendance'} visited={visited.attendance}>
          <CalendarScreen onOpenWorkout={openWorkout} onSettings={() => setSettingsOpen(true)} />
        </Pane>
        <Pane active={tab === 'gym'} visited={visited.gym}>
          <PresenceGate onOpenAttendance={() => goTo('attendance')}>
            <MonthlyPhotoGate>
              <WorkoutScreen />
            </MonthlyPhotoGate>
          </PresenceGate>
        </Pane>
        <Pane active={tab === 'account'} visited={visited.account}>
          <AccountScreen page={accountPage} onPage={setAccountPage} />
        </Pane>

        {/* A running rest timer stays visible on the other tabs. Gym Progress docks its own, unless it is locked. */}
        {(tab !== 'gym' || !canLog(statuses, today)) && timer.status !== 'idle' ? (
          <View className="absolute bottom-0 left-0 right-0 border-t bg-base px-4 py-3" style={{ borderTopColor: colors.line }}>
            <RestBanner />
          </View>
        ) : null}
      </View>

      <BottomTabBar value={tab} onChange={goTo} />

      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_800ExtraBold,
  });

  // Web only: cache the app so it opens instantly and works offline once installed.
  useEffect(() => {
    registerServiceWorker();
    installGlobalHandlers();
  }, []);

  // A failed font load falls back to the system font rather than a black screen.
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: colors.base }} />;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <GymProvider>
          <AttendanceProvider>
            <BodyProvider>
              <PhotosProvider>
                <TimerProvider>
                  <StatusBar style="light" />
                  <Root />
                </TimerProvider>
              </PhotosProvider>
            </BodyProvider>
          </AttendanceProvider>
        </GymProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
