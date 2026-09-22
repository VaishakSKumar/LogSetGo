import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';

import { WorkoutScreen } from '../screens/WorkoutScreen';
import { useGym } from '../store/gym';
import { renderWithApp } from './helpers';

/** Starts with Plank selected — a catalog exercise that smart-detects to Time mode. */
function WithPlank() {
  const { ready, actions } = useGym();
  useEffect(() => {
    if (ready) actions.selectExercise('plank');
  }, [ready, actions]);
  return <WorkoutScreen />;
}

const press = async (label: string | RegExp) => fireEvent.press((await screen.findAllByLabelText(label))[0]);

async function done() {
  await press('Done');
  await waitFor(() => expect(screen.queryByLabelText('Done')).toBeNull());
}

describe('Time-based sets', () => {
  it('a known hold opens in Time mode: the header says Time, weight starts at 0 kg, and the toggle shows Time selected', async () => {
    await renderWithApp(<WithPlank />);
    await screen.findByLabelText('Time mode');
    expect(screen.getByLabelText('Time mode').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Reps mode').props.accessibilityState.selected).toBe(false);
    expect(screen.getByLabelText(/^Set 1 weight in kg: 0/)).toBeTruthy(); // bodyweight by default, not blank
  });

  it('typing raw seconds auto-formats to MM:SS, and logging it shows the duration everywhere', async () => {
    await renderWithApp(<WithPlank />);
    await screen.findByLabelText('Time mode');

    const durationField = await screen.findByLabelText('Set 1 duration: empty');
    await fireEvent.press(durationField);
    const input = await screen.findByLabelText('Set 1 duration');
    await fireEvent.changeText(input, '70');
    await fireEvent(input, 'blur');

    await screen.findByLabelText('Set 1 duration: 1:10');
    await press(/^Log set 1/);
    await screen.findByLabelText('Undo set 1');

    // The live readout swaps kg volume for time under tension.
    await screen.findByLabelText(/^Time under tension: 1:10 this exercise/);
    await done();

    // The logged-exercise card shows the same duration and "Time under tension", not "Volume".
    expect(screen.getByText('1:10')).toBeTruthy();
    expect(screen.getByLabelText('Time under tension 1:10')).toBeTruthy();
    expect(screen.queryByText(/^Volume/)).toBeNull();
  });

  it('the ± stepper moves in 5-second jumps and shows MM:SS, not a raw number', async () => {
    await renderWithApp(<WithPlank />);
    await screen.findByLabelText('Time mode');
    for (let i = 0; i < 9; i++) await press('Increase Time'); // 9 × 5s = 45s
    expect(screen.getAllByText('0:45').length).toBeGreaterThan(0);
    await press(/^Log set 1/);
    await screen.findByLabelText('Undo set 1');
  });

  it('switching the toggle to Reps changes the column and is remembered next time you pick the exercise', async () => {
    await renderWithApp(<WithPlank />);
    await screen.findByLabelText('Time mode');

    await press('Reps mode');
    await screen.findByLabelText('Reps mode');
    expect(screen.getByLabelText('Reps mode').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Set 1 reps: empty')).toBeTruthy();

    // Close without logging anything, then pick the exercise again: the Reps choice stuck.
    await press('Dismiss');
    await waitFor(() => expect(screen.queryByLabelText('Done')).toBeNull());

    const search = await screen.findByLabelText('Exercise search');
    await fireEvent(search, 'focus');
    await fireEvent.changeText(search, 'Plank');
    await fireEvent(search, 'submitEditing');
    await screen.findByLabelText('Reps mode');
    expect(screen.getByLabelText('Reps mode').props.accessibilityState.selected).toBe(true);
  });
});
