import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { longDate } from '../lib/calendar';
import { dateKey } from '../lib/dates';
import { CalendarScreen } from '../screens/CalendarScreen';
import { renderWithApp } from './helpers';

const today = dateKey();
const tile = () => screen.getByLabelText(new RegExp(`^${longDate(today)}`));

describe('Attendance flow', () => {
  it('Absent marks the date and stays on the calendar; Present routes to the workout', async () => {
    const onOpenWorkout = jest.fn();
    await renderWithApp(<CalendarScreen onOpenWorkout={onOpenWorkout} />);

    // The calendar is the landing screen, with the analytics header.
    await waitFor(() => expect(screen.getByText('Showed up')).toBeTruthy());
    expect(tile().props.accessibilityLabel).toContain('Not logged');

    // Tap today → choose Absent.
    await fireEvent.press(tile());
    await fireEvent.press(await screen.findByLabelText(/^Absent\./));
    await waitFor(() => expect(tile().props.accessibilityLabel).toContain('Absent'));
    expect(onOpenWorkout).not.toHaveBeenCalled(); // stays put

    // Absent counts against the rate: 0 of 1 days.
    expect(screen.getByText('0 of 1 days')).toBeTruthy();

    // Change your mind: tap again → Present → routed to the logger for that date.
    await fireEvent.press(tile());
    await fireEvent.press(await screen.findByLabelText(/^Present\./));
    await waitFor(() => expect(onOpenWorkout).toHaveBeenCalledWith(today));
    await waitFor(() => expect(tile().props.accessibilityLabel).toContain('Present'));
  });

  it('Holiday is excused: it neither counts as a day shown up nor lowers the rate', async () => {
    await renderWithApp(<CalendarScreen onOpenWorkout={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('Showed up')).toBeTruthy());

    await fireEvent.press(tile());
    await fireEvent.press(await screen.findByLabelText(/^Holiday\./));
    await waitFor(() => expect(tile().props.accessibilityLabel).toContain('Holiday'));
    expect(screen.getByText('0 of 0 days')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy(); // no rate yet
  });
});
