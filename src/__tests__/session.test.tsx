import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';

import { WorkoutScreen } from '../screens/WorkoutScreen';
import { useGym } from '../store/gym';
import { renderWithApp } from './helpers';

/** Starts with Bench selected, like a user who has picked it from the search box. */
function WithBench() {
  const { ready, actions } = useGym();
  useEffect(() => {
    if (ready) actions.selectExercise('barbell-bench-press');
  }, [ready, actions]);
  return <WorkoutScreen />;
}

const press = async (label: string | RegExp) => fireEvent.press((await screen.findAllByLabelText(label))[0]);

/** 4 × 2.5 kg = 10 kg for 5 reps on set 1: 50 kg of volume. */
async function logSetOfFifty() {
  for (let i = 0; i < 4; i++) await press('Increase kg');
  for (let i = 0; i < 5; i++) await press('Increase Reps');
  await press(/^Log set 1/);
  await screen.findByLabelText('Undo set 1');
}

/** Done, then wait for the drawer to finish sliding away and unmount. */
async function done() {
  await press('Done');
  await waitFor(() => expect(screen.queryByLabelText('Done')).toBeNull());
}

describe('Gym Progress states', () => {
  it('State A: an empty day is just a search bar and a prompt, with no + button', async () => {
    await renderWithApp(<WorkoutScreen />);
    await screen.findByText('What are you training?');
    expect(screen.getByLabelText('Exercise search')).toBeTruthy();
    expect(screen.getByText('No exercises logged for today. Start by typing an exercise above.')).toBeTruthy();
    expect(screen.queryByLabelText('Add exercise')).toBeNull();
    expect(screen.queryByLabelText(/^Total volume/)).toBeNull();
    expect(screen.queryByLabelText('Done')).toBeNull(); // the drawer is closed
  });

  it('picking an exercise opens the drawer; Done saves, closes it and shows the summary', async () => {
    await renderWithApp(<WithBench />);
    await screen.findAllByLabelText('Log set 1'); // drawer open with the recorder
    expect(screen.getByLabelText('Done')).toBeTruthy();
    expect(screen.queryByLabelText('Add exercise')).toBeNull(); // still the single-path first session

    await logSetOfFifty();

    // Sets save as they're checked, so the page behind the drawer is already current.
    await screen.findByLabelText('Total volume 50 kg');
    expect(screen.getByLabelText('1 exercise')).toBeTruthy();
    expect(screen.getByLabelText(/^Volume: 50 kg this exercise, 50 kg today/)).toBeTruthy();

    (Haptics.impactAsync as jest.Mock).mockClear();
    await done();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light'); // the Done pulse
    expect(screen.queryAllByLabelText(/^Log set 1/)).toHaveLength(0); // back on the main screen
    expect(screen.getByLabelText('More options for Barbell Bench Press')).toBeTruthy();
    expect(screen.getByLabelText('Total volume 50 kg')).toBeTruthy();

    // + opens the drawer again with nothing selected.
    await press('Add exercise');
    await screen.findByText('Pick an exercise to start');
  });

  it('Done will not save an exercise with nothing checked off, and says why', async () => {
    await renderWithApp(<WithBench />);
    await screen.findAllByLabelText('Log set 1');

    (Haptics.notificationAsync as jest.Mock).mockClear();
    await press('Done');
    await screen.findByText(/Check off at least one set/);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('warning');
    expect(screen.getByLabelText('Done')).toBeTruthy(); // still open
    expect(screen.queryByLabelText('Total volume 0 kg')).toBeNull();
  });

  it('the ✕ clears the search text and leaves the drawer open', async () => {
    await renderWithApp(<WithBench />);
    await screen.findAllByLabelText('Log set 1');
    await logSetOfFifty();
    await done();

    await press('Add exercise');
    const search = await screen.findByLabelText('Exercise search');
    expect(screen.queryByLabelText('Clear search')).toBeNull(); // nothing typed, no ✕

    await fireEvent(search, 'focus');
    await fireEvent.changeText(search, 'Barbell R');
    await screen.findByLabelText('Clear search');

    await press('Clear search');
    await waitFor(() => expect(screen.getByLabelText('Exercise search').props.value).toBe(''));
    expect(screen.queryByLabelText('Clear search')).toBeNull(); // hidden again once it's empty
    expect(screen.getByLabelText('Done')).toBeTruthy(); // the drawer did not close
  });

  it('deleting asks first, then removes the exercise and takes its volume off the total', async () => {
    // Two full log-and-drawer-close cycles plus a confirmation sheet: the slowest test here,
    // and right at Jest's 5s default under load — give it real headroom instead of flaking.
    await renderWithApp(<WithBench />);
    await screen.findAllByLabelText('Log set 1');
    await logSetOfFifty();
    await done();

    // A second exercise, chosen through the search bar in the drawer.
    await press('Add exercise');
    const search = await screen.findByLabelText('Exercise search');
    await fireEvent(search, 'focus');
    await fireEvent.changeText(search, 'Barbell Row');
    await fireEvent(search, 'submitEditing');
    await logSetOfFifty();
    await screen.findByLabelText('Total volume 100 kg');
    expect(screen.getByLabelText('2 exercises')).toBeTruthy();
    await done();

    // ••• → Delete exercise… → an explicit confirmation. Nothing is gone until you confirm.
    await press('More options for Barbell Bench Press');
    await press('Delete exercise');
    await screen.findByText('Delete Barbell Bench Press?');
    expect(screen.getByLabelText('Total volume 100 kg')).toBeTruthy();

    (Haptics.impactAsync as jest.Mock).mockClear();
    await press('Delete');
    await waitFor(() => expect(screen.getByLabelText('Total volume 50 kg')).toBeTruthy());
    expect(screen.getByLabelText('1 exercise')).toBeTruthy();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('medium');
    expect(screen.queryByLabelText('More options for Barbell Bench Press')).toBeNull();
    expect(screen.getByLabelText('More options for Barbell Row')).toBeTruthy();
  }, 15000);

  it('the swipe-revealed Delete goes through the same confirmation and can be cancelled', async () => {
    await renderWithApp(<WithBench />);
    await screen.findAllByLabelText('Log set 1');
    await logSetOfFifty();
    await done();

    await press('Delete Barbell Bench Press'); // the red button behind the card
    await screen.findByText('Delete Barbell Bench Press?');
    await press('Cancel');
    await waitFor(() => expect(screen.getByLabelText('Total volume 50 kg')).toBeTruthy());
    expect(screen.getByLabelText('More options for Barbell Bench Press')).toBeTruthy();
  });

  it('deleting the only exercise returns to the empty state', async () => {
    await renderWithApp(<WithBench />);
    await screen.findAllByLabelText('Log set 1');
    await logSetOfFifty();
    await done();

    await press('More options for Barbell Bench Press');
    await press('Delete exercise');
    await press('Delete');
    await screen.findByText('No exercises logged for today. Start by typing an exercise above.');
    expect(screen.queryByLabelText('Add exercise')).toBeNull();
  });
});
