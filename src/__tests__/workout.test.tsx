import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';

import { WorkoutScreen } from '../screens/WorkoutScreen';
import { useGym } from '../store/gym';
import { renderWithApp } from './helpers';

/** Starts with Bench selected, like a user who has picked it from the search box. */
function Harness() {
  const { ready, actions } = useGym();
  useEffect(() => {
    if (ready) actions.selectExercise('barbell-bench-press');
  }, [ready, actions]);
  return <WorkoutScreen />;
}

/** Presses the first element with this label. ("Log set 1" is both the row's check and the dock button; either logs it.) */
const press = async (label: string | RegExp) => fireEvent.press((await screen.findAllByLabelText(label))[0]);

describe('Logging a workout', () => {
  it('logs a set, auto-starts the rest timer, and keeps warm-ups out of the volume', async () => {
    await renderWithApp(<Harness />);
    await screen.findAllByLabelText('Log set 1'); // exercise selected, dock ready

    // Build set 1 with the dock steppers: 4 × 2.5 kg = 10 kg, 5 reps -> 50 kg of volume.
    for (let i = 0; i < 4; i++) await press('Increase kg');
    for (let i = 0; i < 5; i++) await press('Increase Reps');
    await press(/^Log set 1/);

    // The row locks (undo is offered) and the rest timer starts by itself.
    await screen.findByLabelText('Undo set 1');
    await waitFor(() => expect(screen.getByLabelText(/remaining$/)).toBeTruthy());
    await waitFor(() => expect(screen.getAllByText('50').length).toBeGreaterThan(0)); // weekly volume

    // Set 2: mark it as a warm-up, then log it (its ghost is 10 kg × 5).
    await press(/^Set 2 details/);
    await fireEvent.press(await screen.findByText('Warm-up'));
    await press('Close');
    await press(/^Log set 2/);
    await screen.findByLabelText('Undo set 2');

    // A working set of the same size would have doubled the volume to 100. The warm-up did not.
    expect(screen.queryAllByText('100')).toHaveLength(0);
    expect(screen.getAllByText('50').length).toBeGreaterThan(0);
  });

  it('undoing a logged set returns the row to editable', async () => {
    await renderWithApp(<Harness />);
    await screen.findAllByLabelText('Log set 1');
    await press('Increase kg');
    await press('Increase Reps');
    await press(/^Log set 1/);
    await press('Undo set 1');
    await screen.findAllByLabelText('Log set 1');
    expect(screen.queryByLabelText('Undo set 1')).toBeNull();
  });
});
