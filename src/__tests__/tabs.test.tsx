import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BottomTabBar } from '../components/BottomTabBar';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

describe('BottomTabBar', () => {
  it('shows the three tabs and reports the one you tap', async () => {
    const onChange = jest.fn();
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <BottomTabBar value="attendance" onChange={onChange} />
      </SafeAreaProvider>,
    );
    expect(screen.getByText('Attendance')).toBeTruthy();
    expect(screen.getByText('Gym Progress')).toBeTruthy();
    await fireEvent.press(screen.getByText('Account'));
    expect(onChange).toHaveBeenCalledWith('account');
  });
});
