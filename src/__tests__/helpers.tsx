import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AttendanceProvider } from '../store/attendance';
import { BodyProvider } from '../store/body';
import { GymProvider } from '../store/gym';
import { TimerProvider } from '../store/timer';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

/** Renders a screen inside every real provider (storage is the in-memory AsyncStorage mock). */
export async function renderWithApp(ui: ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <GymProvider>
        <AttendanceProvider>
          <BodyProvider>
            <TimerProvider>{ui}</TimerProvider>
          </BodyProvider>
        </AttendanceProvider>
      </GymProvider>
    </SafeAreaProvider>,
  );
}
