import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { PresenceGate } from '../components/PresenceGate';
import { CalendarScreen } from '../screens/CalendarScreen';
import { renderWithApp } from './helpers';

/** The dashboard and the gate side by side, sharing the same real providers. */
const Harness = ({ onAttendance = jest.fn() }: { onAttendance?: () => void }) => (
  <>
    <CalendarScreen onOpenWorkout={jest.fn()} onSettings={jest.fn()} />
    <PresenceGate onOpenAttendance={onAttendance}>
      <Text>LOGGER OPEN</Text>
    </PresenceGate>
  </>
);

describe('Gym Progress is only open for a Present day', () => {
  it('is locked until today is marked Present, and locks again on Absent or Holiday', async () => {
    const onAttendance = jest.fn();
    await renderWithApp(<Harness onAttendance={onAttendance} />);

    // Unmarked: closed, with a route back to Attendance.
    await screen.findByLabelText('Gym Progress is locked');
    expect(screen.queryByText('LOGGER OPEN')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Go to Punch In'));
    expect(onAttendance).toHaveBeenCalled();

    // Present opens it.
    await fireEvent.press(screen.getByLabelText('Punch In / Start Workout'));
    await fireEvent.press(await screen.findByLabelText('🟢 Start Workout'));
    await screen.findByText('LOGGER OPEN');
    expect(screen.queryByLabelText('Gym Progress is locked')).toBeNull();

    // Undo, then Absent: closed, and it says why.
    await fireEvent.press(await screen.findByLabelText('Undo punch-in'));
    await fireEvent.press(await screen.findByLabelText('Absent'));
    await screen.findByLabelText('Gym Progress is locked');
    expect(screen.getByText('No workout to log today.')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Undo'));
    await fireEvent.press(await screen.findByLabelText('Holiday'));
    await waitFor(() => expect(screen.getByText('Today is a planned rest day.')).toBeTruthy());
    expect(screen.queryByText('LOGGER OPEN')).toBeNull();
  });
});
