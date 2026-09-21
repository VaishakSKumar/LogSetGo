import './global.css';

import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { RestBanner } from './src/components/RestBanner';
import { TopTabBar, type TabKey } from './src/components/TopTabBar';
import { BodyScreen } from './src/screens/BodyScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { WorkoutScreen } from './src/screens/WorkoutScreen';
import { AttendanceProvider, useAttendance } from './src/store/attendance';
import { BodyProvider, useBody } from './src/store/body';
import { GymProvider, useGym } from './src/store/gym';
import { TimerProvider, useTimer } from './src/store/timer';
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
 * App shell: top tab bar + three panes.
 *  · Attendance: calendar, P / A / H, showing-up stats. "Present" hops to Gym Progress for that date.
 *  · Gym Progress: exercise logger, set/rep counter, autofill box, rest timer.
 *  · BMI & Weight: weight log, height, BMI gauge, progress.
 */
function Root() {
  const { ready: gymReady, actions } = useGym();
  const { ready: attendanceReady } = useAttendance();
  const { ready: bodyReady } = useBody();
  const { timer } = useTimer();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<TabKey>('attendance');
  const [visited, setVisited] = useState<Record<TabKey, boolean>>({ attendance: true, gym: false, body: false });

  const goTo = useCallback((next: TabKey) => {
    setVisited((v) => (v[next] ? v : { ...v, [next]: true }));
    setTab(next);
  }, []);

  /** Daily flow: choosing Present on the calendar points the logger at that date and opens it. */
  const openWorkout = useCallback(
    (date: string) => {
      actions.setWorkDate(date);
      goTo('gym');
    },
    [actions, goTo],
  );

  // Android hardware back: any tab returns to Attendance first, then the app closes.
  useEffect(() => {
    if (tab === 'attendance') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setTab('attendance');
      return true;
    });
    return () => sub.remove();
  }, [tab]);

  if (!gymReady || !attendanceReady || !bodyReady) return <View className="flex-1 bg-base" />;

  return (
    <View className="flex-1 bg-base">
      <TopTabBar value={tab} onChange={goTo} />

      <View className="flex-1">
        <Pane active={tab === 'attendance'} visited={visited.attendance}>
          <CalendarScreen onOpenWorkout={openWorkout} />
        </Pane>
        <Pane active={tab === 'gym'} visited={visited.gym}>
          <WorkoutScreen />
        </Pane>
        <Pane active={tab === 'body'} visited={visited.body}>
          <BodyScreen />
        </Pane>

        {/* A running rest timer stays visible on the other tabs. Gym Progress docks its own. */}
        {tab !== 'gym' && timer.status !== 'idle' ? (
          <View
            className="absolute bottom-0 left-0 right-0 border-t bg-base px-4 pt-3"
            style={{ borderTopColor: colors.line, paddingBottom: Math.max(insets.bottom, 12) + 4 }}
          >
            <RestBanner />
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GymProvider>
        <AttendanceProvider>
          <BodyProvider>
            <TimerProvider>
              <StatusBar style="light" />
              <Root />
            </TimerProvider>
          </BodyProvider>
        </AttendanceProvider>
      </GymProvider>
    </SafeAreaProvider>
  );
}
