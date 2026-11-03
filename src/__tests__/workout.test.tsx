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
/** Taps into a kg / reps field. */
const focus = async (label: string) => fireEvent(await screen.findByLabelText(label), 'focus');

describe('Logging a workout', () => {
  it('logs a set, auto-starts the rest timer, and keeps warm-ups out of the volume', async () => {
    await renderWithApp(<Harness />);
    await screen.findAllByLabelText('Log set 1'); // exercise selected, dock ready

    // Build set 1 with the dock steppers: 4 × 2.5 kg = 10 kg, 5 reps -> 50 kg of volume.
    for (let i = 0; i < 4; i++) await press('Increase kg');
    for (let i = 0; i < 5; i++) await press('Increase reps');
    await press(/^Log set 1/);

    // The row locks (undo is offered) and the rest timer starts by itself.
    await screen.findByLabelText('Undo set 1');
    await waitFor(() => expect(screen.getByLabelText(/remaining$/)).toBeTruthy());
    await waitFor(() => expect(screen.getAllByText('50').length).toBeGreaterThan(0)); // weekly volume

    // Set 2 starts empty (nothing is copied from set 1). Fill it the same, mark it a warm-up, log it.
    expect(screen.getByLabelText('Set 2 weight in kg: empty')).toBeTruthy();
    expect(screen.getByLabelText('Set 2 reps: empty')).toBeTruthy();
    for (let i = 0; i < 4; i++) await press('Increase kg');
    for (let i = 0; i < 5; i++) await press('Increase reps');
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
    await press('Increase reps');
    await press(/^Log set 1/);
    await press('Undo set 1');
    await screen.findAllByLabelText('Log set 1');
    expect(screen.queryByLabelText('Undo set 1')).toBeNull();
  });
});

describe('Typing a set', () => {
  it('goes from kg to reps, and the tick logs what is typed even with the keyboard still open', async () => {
    await renderWithApp(<Harness />);
    await focus('Set 1 weight in kg: empty');
    await fireEvent.changeText(await screen.findByLabelText('Set 1 weight in kg'), '60');
    await fireEvent(screen.getByLabelText('Set 1 weight in kg'), 'submitEditing');

    // "Next" on the keyboard moves straight to reps.
    await fireEvent.changeText(await screen.findByLabelText('Set 1 reps'), '8');
    await press(/^Log set 1/);

    await screen.findByLabelText('Undo set 1');
    expect(screen.getByLabelText('Set 1 weight in kg: 60')).toBeTruthy();
    expect(screen.getByLabelText('Set 1 reps: 8')).toBeTruthy();
    // Set 2 is not a copy of set 1.
    expect(screen.getByLabelText('Set 2 weight in kg: empty')).toBeTruthy();
    expect(screen.getByLabelText('Set 2 reps: empty')).toBeTruthy();
  });

  it('after Next, ignores repeated kg text and gives fast keys to reps', async () => {
    await renderWithApp(<Harness />);
    await focus('Set 1 weight in kg: empty');
    const kg = await screen.findByLabelText('Set 1 weight in kg');
    await fireEvent.changeText(kg, '42.5');
    await fireEvent(kg, 'submitEditing');
    await fireEvent.changeText(kg, '42.5'); // Android repeats the last text after "Next"
    expect((await screen.findByLabelText('Set 1 reps')).props.value).toBe('');
    await fireEvent.changeText(kg, '42.59'); // a key pressed before the keyboard reached reps
    expect((await screen.findByLabelText('Set 1 reps')).props.value).toBe('9');
    await press(/^Log set 1/);

    await screen.findByLabelText('Undo set 1');
    expect(screen.getByLabelText('Set 1 weight in kg: 42.5')).toBeTruthy();
    expect(screen.getByLabelText('Set 1 reps: 9')).toBeTruthy();
  });

  it('a replaced value is the one that is logged', async () => {
    await renderWithApp(<Harness />);
    await focus('Set 1 weight in kg: empty');
    await fireEvent.changeText(await screen.findByLabelText('Set 1 weight in kg'), '60');
    await focus('Set 1 reps: empty'); // tapping reps saves kg and moves the keyboard there
    await fireEvent.changeText(await screen.findByLabelText('Set 1 reps'), '8');

    await focus('Set 1 weight in kg: 60');
    await fireEvent.changeText(await screen.findByLabelText('Set 1 weight in kg'), '');
    await fireEvent.changeText(screen.getByLabelText('Set 1 weight in kg'), '72.5');
    await press(/^Log set 1/);

    await screen.findByLabelText('Undo set 1');
    expect(screen.getByLabelText('Set 1 weight in kg: 72.5')).toBeTruthy();
    expect(screen.getByLabelText('Set 1 reps: 8')).toBeTruthy();
  });

  it('a set with no reps is not logged', async () => {
    await renderWithApp(<Harness />);
    await focus('Set 1 weight in kg: empty');
    await fireEvent.changeText(await screen.findByLabelText('Set 1 weight in kg'), '60');
    await press(/^Log set 1/);
    expect(screen.queryByLabelText('Undo set 1')).toBeNull();
    expect(screen.getByLabelText('Set 1 weight in kg: 60')).toBeTruthy();
  });

  it('switches between kg and lbs', async () => {
    await renderWithApp(<Harness />);
    await focus('Set 1 weight in kg: empty');
    await fireEvent.changeText(await screen.findByLabelText('Set 1 weight in kg'), '100');
    await focus('Set 1 reps: empty');
    await fireEvent.changeText(await screen.findByLabelText('Set 1 reps'), '5');
    await press(/^Log set 1/);

    await press('Weights in lbs');
    await screen.findByLabelText('Set 1 weight in lb: 220.5');
    await press('Weights in kg');
    await screen.findByLabelText('Set 1 weight in kg: 100');
  });
});

describe('Editing a filled field', () => {
  it('starts empty with the old value as a hint, and leaving it empty keeps the old value', async () => {
    await renderWithApp(<Harness />);
    await focus('Set 1 weight in kg: empty');
    await fireEvent.changeText(await screen.findByLabelText('Set 1 weight in kg'), '60');
    await fireEvent(screen.getByLabelText('Set 1 weight in kg'), 'blur');
    await screen.findByLabelText('Set 1 weight in kg: 60');

    await focus('Set 1 weight in kg: 60');
    const input = await screen.findByLabelText('Set 1 weight in kg');
    expect(input.props.value).toBe('');
    expect(screen.getByText('60', { includeHiddenElements: true })).toBeTruthy(); // the old value, in grey
    await fireEvent.changeText(input, '6');
    expect(screen.queryByText('60', { includeHiddenElements: true })).toBeNull();
    await fireEvent.changeText(input, '');
    await fireEvent(input, 'blur');
    await screen.findByLabelText('Set 1 weight in kg: 60');
  });
});
