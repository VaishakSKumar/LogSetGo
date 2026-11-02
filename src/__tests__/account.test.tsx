import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';

import { PlanFlow } from '../components/plans/PlanFlow';
import { YourPlans } from '../components/session/PlanLists';
import { MonthlyPhotoGate } from '../components/session/MonthlyPhotoGate';
import { dateKey } from '../lib/dates';
import { AccountScreen, type AccountPage } from '../screens/AccountScreen';
import { renderWithApp } from './helpers';

const today = dateKey();

function Account() {
  const [page, setPage] = useState<AccountPage | null>(null);
  return <AccountScreen page={page} onPage={setPage} />;
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Account', () => {
  it('asks for the photo until one is added, then offers Replace', async () => {
    await renderWithApp(<Account />);
    await screen.findByLabelText(/^Add monthly check-in photo/);
    expect(screen.queryByText('Replace')).toBeNull();
    expect(screen.getByText('Add your weight and height')).toBeTruthy();
    expect(screen.getByText('No days marked yet')).toBeTruthy();
    expect(screen.getByText('Log your weight to see progress')).toBeTruthy();
  });

  it('shows Replace and three months once this month has a photo', async () => {
    await AsyncStorage.setItem('minimalist-gym-tracker/photos/v1', JSON.stringify({ [today]: { date: today, uri: 'file:///p.jpg', mimeType: 'image/jpeg', size: 1 } }));
    await renderWithApp(<Account />);
    await screen.findByText('Replace');
    expect(screen.getByText('Monthly check-in photo')).toBeTruthy();
    expect(screen.getAllByText('No photo')).toHaveLength(2);
  });

  it('opens the stats pages and comes back', async () => {
    await renderWithApp(<Account />);
    await fireEvent.press(await screen.findByLabelText(/^Gym Attendance stats/));
    await screen.findByText('Weekly progress');
    expect(screen.getByText('0 of 5 days done, 5 to go')).toBeTruthy();
    expect(screen.getByText('No days marked')).toBeTruthy();

    await fireEvent.press(screen.getByText('0 of 5 days done, 5 to go'));
    await fireEvent.press(await screen.findByLabelText('3 days'));
    await screen.findByText('0 of 3 days done, 3 to go');

    await fireEvent.press(screen.getByLabelText('Back to Account'));
    await fireEvent.press(await screen.findByLabelText(/^Weight Progress stat/));
    await screen.findByText('Log your first weight to start your chart.');
  });
});

describe('Monthly check-in', () => {
  it('Skip opens the workout and stays skipped this month', async () => {
    await renderWithApp(
      <MonthlyPhotoGate>
        <Text>Workout</Text>
      </MonthlyPhotoGate>,
    );
    await fireEvent.press(await screen.findByText('Skip for now'));
    await screen.findByText('Workout');
    await waitFor(async () => expect(await AsyncStorage.getItem('minimalist-gym-tracker/v1')).toContain(`"skippedPhotoMonth":"${today.slice(0, 7)}"`));
    expect(screen.queryByText('Skip for now')).toBeNull();
  });
});

describe('New workout plan', () => {
  const flow = (
    <>
      <PlanFlow visible onClose={() => {}} />
      <YourPlans />
    </>
  );

  it('walks from the choice through the info screen to a saved plan', async () => {
    await renderWithApp(flow);
    await fireEvent.press(await screen.findByLabelText('Add manually'));
    await screen.findByText(/Build your/);
    await fireEvent.press(screen.getByLabelText('Don’t show this again'));
    await fireEvent.press(screen.getByLabelText('Start my plan'));

    expect((await screen.findByLabelText('Save plan')).props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(screen.getByLabelText('Plan name'), 'Push Day');
    expect(screen.getByLabelText('Save plan').props.accessibilityState.disabled).toBe(true); // still no exercise

    await fireEvent.press(screen.getByText('Add exercise'));
    await fireEvent.changeText(await screen.findByLabelText('Search exercises'), 'bench press');
    await fireEvent.press((await screen.findAllByLabelText(/Bench Press/))[0]);
    const more = await screen.findByLabelText(/^More sets of/);
    await fireEvent.press(more);
    await screen.findByText('4 sets');

    await fireEvent.press(screen.getByLabelText('Save plan'));
    await screen.findByLabelText('Start Push Day, 1 exercise');
  });

  it('offers a new exercise when the search finds nothing', async () => {
    await renderWithApp(flow);
    await fireEvent.press(await screen.findByLabelText('Add manually'));
    await fireEvent.press(await screen.findByLabelText('Start my plan'));
    await fireEvent.press(await screen.findByText('Add exercise'));
    await fireEvent.changeText(await screen.findByLabelText('Search exercises'), 'Zzz Lift');
    await fireEvent.press(await screen.findByLabelText('Add Zzz Lift as a new exercise'));
    await screen.findByText('Zzz Lift');
  });

  it('file info shows the example and leads to the file chooser', async () => {
    await renderWithApp(flow);
    await fireEvent.press(await screen.findByLabelText('Import from a file'));
    await screen.findByText('Excel or CSV columns');
    await fireEvent.press(screen.getByLabelText('Choose my file'));
    await screen.findByText('Import your plan');
    await screen.findByLabelText('Choose a file');
  });
});
