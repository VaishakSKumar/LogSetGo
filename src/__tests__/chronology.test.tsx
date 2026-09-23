import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useEffect, useRef } from 'react';

import { Header } from '../components/Header';
import { PresenceGate } from '../components/PresenceGate';
import { addDays, dateKey, shortDate } from '../lib/dates';
import { defaultLabelFor } from '../lib/progress';
import { WorkoutScreen } from '../screens/WorkoutScreen';
import { useGym } from '../store/gym';
import { renderWithApp } from './helpers';

const today = dateKey();
const yesterday = addDays(today, -1);
const tomorrow = addDays(today, 1);

const press = async (label: string | RegExp) => fireEvent.press((await screen.findAllByLabelText(label))[0]);

/** Navigates to `date`, then bypasses the read-only UI to seed one logged set there directly. */
function WithPastLog({ date, children }: { date: string; children: React.ReactNode }) {
  const { ready, today: workDate, rows, actions } = useGym();
  const stage = useRef<'date' | 'select' | 'waitRows' | 'done'>('date');

  useEffect(() => {
    if (!ready) return;
    if (stage.current === 'date') {
      if (workDate !== date) {
        actions.setWorkDate(date);
        return;
      }
      stage.current = 'select';
    }
    if (stage.current === 'select') {
      actions.selectExercise('barbell-bench-press');
      stage.current = 'waitRows';
      return;
    }
    if (stage.current === 'waitRows' && rows.length > 0) {
      actions.toggleSet(rows[0].id, 60, 8);
      stage.current = 'done';
    }
  }, [ready, workDate, rows, actions, date]);

  return <>{children}</>;
}

describe('PresenceGate only protects today', () => {
  it('locks today when not Present, but never locks any other date', async () => {
    function Harness() {
      const { actions } = useGym();
      return (
        <>
          <PresenceGate onOpenAttendance={jest.fn()}>
            <Text>PROTECTED</Text>
          </PresenceGate>
          <Text accessibilityRole="button" accessibilityLabel="go yesterday" onPress={() => actions.setWorkDate(yesterday)}>
            go yesterday
          </Text>
          <Text accessibilityRole="button" accessibilityLabel="go tomorrow" onPress={() => actions.setWorkDate(tomorrow)}>
            go tomorrow
          </Text>
        </>
      );
    }
    await renderWithApp(<Harness />);
    await screen.findByLabelText('Gym Progress is locked'); // today, unmarked: locked
    expect(screen.queryByText('PROTECTED')).toBeNull();

    await fireEvent.press(screen.getByLabelText('go yesterday'));
    await screen.findByText('PROTECTED'); // a past date is never gated
    expect(screen.queryByLabelText('Gym Progress is locked')).toBeNull();

    await fireEvent.press(screen.getByLabelText('go tomorrow'));
    await screen.findByText('PROTECTED'); // neither is a future date
  });
});

describe('Gym Progress reflects the selected date', () => {
  it('a future date shows the empty-state placeholder, with no search bar and no way to log', async () => {
    function Harness() {
      const { ready, actions } = useGym();
      useEffect(() => {
        if (ready) actions.setWorkDate(tomorrow);
      }, [ready, actions]);
      return <WorkoutScreen />;
    }
    await renderWithApp(<Harness />);
    await screen.findByText('No workout logged for this date yet.');
    expect(screen.queryByLabelText('Exercise search')).toBeNull();
    expect(screen.queryByLabelText('Add exercise')).toBeNull();
  });

  it('an untouched past date shows a plain "nothing logged" placeholder, not the today search hero', async () => {
    function Harness() {
      const { ready, actions } = useGym();
      useEffect(() => {
        if (ready) actions.setWorkDate(yesterday);
      }, [ready, actions]);
      return <WorkoutScreen />;
    }
    await renderWithApp(<Harness />);
    await screen.findByText('Nothing was logged on this day.');
    expect(screen.queryByLabelText('Exercise search')).toBeNull();
  });

  it('a past date with a logged set is a read-only activity log: no + button, no ••• menu, no swipe delete', async () => {
    await renderWithApp(
      <WithPastLog date={yesterday}>
        <WorkoutScreen />
      </WithPastLog>,
    );
    await screen.findByText('Barbell Bench Press');
    expect(screen.getByText('60')).toBeTruthy();
    expect(screen.getByText('8')).toBeTruthy();

    // Nothing here can change what's already logged.
    expect(screen.queryByLabelText('Add exercise')).toBeNull();
    expect(screen.queryByLabelText('More options for Barbell Bench Press')).toBeNull();
    expect(screen.queryByLabelText('Delete Barbell Bench Press')).toBeNull();
    expect(screen.queryByLabelText('Done')).toBeNull(); // the recorder never opens
  });
});

describe('Day-to-day navigation', () => {
  it("the header's arrows step the date one day at a time, and each day keeps its own label", async () => {
    await renderWithApp(<Header />);

    // Name today via the picker (a fixed default, so this test never depends on today's weekday).
    await press(/^Workout day /);
    await press('Full Body');
    await screen.findByLabelText('Workout day Full Body. Tap to change.');

    await press('Previous day');
    await screen.findByLabelText(`Logging ${shortDate(yesterday)}. Jump to today.`);
    // Yesterday was never named, so it shows its own weekday default, not today's "Full Body".
    await screen.findByLabelText(`Workout day ${defaultLabelFor(yesterday)}. Tap to change.`);

    await press('Next day');
    await press('Next day');
    await screen.findByLabelText(`Logging ${shortDate(tomorrow)}. Jump to today.`);
    await screen.findByLabelText(`Workout day ${defaultLabelFor(tomorrow)}. Tap to change.`);

    await press('Previous day');
    await waitFor(() => expect(screen.queryByLabelText(/^Logging /)).toBeNull()); // back on today
    await screen.findByLabelText('Workout day Full Body. Tap to change.'); // today's name stuck
  });
});
