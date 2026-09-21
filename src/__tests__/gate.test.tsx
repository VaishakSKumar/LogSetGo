import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { PresenceGate } from '../components/PresenceGate';
import { longDate } from '../lib/calendar';
import { dateKey } from '../lib/dates';
import { CalendarScreen } from '../screens/CalendarScreen';
import { renderWithApp } from './helpers';

const today = dateKey();
const tile = () => screen.getByLabelText(new RegExp(`^${longDate(today)}`));

/** The calendar and the gate side by side, sharing the same real providers. */
const Harness = ({ onAttendance = jest.fn() }: { onAttendance?: () => void }) => (
  <>
    <CalendarScreen onOpenWorkout={jest.fn()} />
    <PresenceGate onOpenAttendance={onAttendance}>
      <Text>LOGGER OPEN</Text>
    </PresenceGate>
  </>
);

describe('Gym Progress is only open for a Present day', () => {
  it('is locked until today is marked Present, and locks again on Absent or Holiday', async () => {
    const onAttendance = jest.fn();
    await renderWithApp(<Harness onAttendance={onAttendance} />);

    // Unmarked: closed, with a route to the calendar.
    await screen.findByLabelText('Gym Progress is locked');
    expect(screen.queryByText('LOGGER OPEN')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Open Attendance'));
    expect(onAttendance).toHaveBeenCalled();

    // Present opens it.
    await fireEvent.press(tile());
    await fireEvent.press(await screen.findByLabelText(/^Present\./));
    await screen.findByText('LOGGER OPEN');
    expect(screen.queryByLabelText('Gym Progress is locked')).toBeNull();

    // Changing your mind closes it and says why.
    await fireEvent.press(tile());
    await fireEvent.press(await screen.findByLabelText(/^Absent\./));
    await screen.findByLabelText('Gym Progress is locked');
    expect(screen.getByText('Today is marked Absent.')).toBeTruthy();

    await fireEvent.press(tile());
    await fireEvent.press(await screen.findByLabelText(/^Holiday\./));
    await waitFor(() => expect(screen.getByText('Today is marked Holiday.')).toBeTruthy());
    expect(screen.queryByText('LOGGER OPEN')).toBeNull();
  });
});
