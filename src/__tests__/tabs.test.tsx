import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TopTabBar } from '../components/TopTabBar';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

describe('TopTabBar', () => {
  it('shows the three tabs and reports the one you tap', async () => {
    const onChange = jest.fn();
    const onSettings = jest.fn();
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <TopTabBar value="attendance" onChange={onChange} onSettings={onSettings} />
      </SafeAreaProvider>,
    );
    expect(screen.getByText('Attendance')).toBeTruthy();
    expect(screen.getByText('Gym Progress')).toBeTruthy();
    await fireEvent.press(screen.getByText('BMI & Weight'));
    expect(onChange).toHaveBeenCalledWith('body');
    await fireEvent.press(screen.getByLabelText('Settings'));
    expect(onSettings).toHaveBeenCalledTimes(1);
  });
});
