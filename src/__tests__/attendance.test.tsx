import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { CalendarScreen } from '../screens/CalendarScreen';
import { renderWithApp } from './helpers';

const noop = () => {};

const openCalendar = async () => {
  await fireEvent.press(await screen.findByLabelText('Open attendance calendar'));
  await screen.findByLabelText('Attendance calendar');
};

describe('Attendance dashboard', () => {
  it('marks Absent in one tap, shows it, and Undo brings the punch button back', async () => {
    const onOpenWorkout = jest.fn();
    await renderWithApp(<CalendarScreen onOpenWorkout={onOpenWorkout} onSettings={noop} />);

    await fireEvent.press(await screen.findByLabelText('Absent'));
    await screen.findByText('Streak back to 0');
    expect(screen.getByText('Undo to punch in instead.')).toBeTruthy();
    expect(onOpenWorkout).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByLabelText('Undo'));
    await screen.findByLabelText('Punch In / Start Workout');
  });

  it('Holiday keeps the streak, and Settings opens from the header', async () => {
    const onSettings = jest.fn();
    await renderWithApp(<CalendarScreen onOpenWorkout={noop} onSettings={onSettings} />);

    await fireEvent.press(await screen.findByLabelText('Holiday'));
    await screen.findByText('Planned rest, streak kept');

    await fireEvent.press(screen.getByLabelText('Settings'));
    expect(onSettings).toHaveBeenCalledTimes(1);
  });

  it('the calendar popup sets today, and tapping the selected status clears it', async () => {
    await renderWithApp(<CalendarScreen onOpenWorkout={noop} onSettings={noop} />);
    await openCalendar();

    const sheetButton = (label: string) => screen.getAllByLabelText(label).at(-1)!;
    await fireEvent.press(sheetButton('Absent'));
    await screen.findByText('Streak back to 0');

    await fireEvent.press(sheetButton('Absent'));
    await waitFor(() => expect(screen.queryByText('Streak back to 0')).toBeNull());
  });

  it('switches between the weekly dial and the monthly grid', async () => {
    await renderWithApp(<CalendarScreen onOpenWorkout={noop} onSettings={noop} />);
    await openCalendar();

    expect(screen.queryByLabelText('Previous month')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Monthly'));
    expect(screen.getByLabelText('Previous month')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Weekly'));
    expect(screen.queryByLabelText('Previous month')).toBeNull();
  });
});
