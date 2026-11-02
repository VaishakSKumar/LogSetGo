import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect } from 'react';
import { Text } from 'react-native';

import { MonthlyPhotoGate } from '../components/session/MonthlyPhotoGate';
import { dateKey } from '../lib/dates';
import { CalendarScreen } from '../screens/CalendarScreen';
import { WorkoutScreen } from '../screens/WorkoutScreen';
import { useGym } from '../store/gym';
import { renderWithApp } from './helpers';

const today = dateKey();
const card = () => screen.getByLabelText('Punch In / Start Workout');

function WithBench() {
  const { ready, actions } = useGym();
  useEffect(() => {
    if (ready) actions.selectExercise('barbell-bench-press');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  return <WorkoutScreen />;
}

describe('Punch In sheet', () => {
  it('opens the sheet instead of marking today, and each option does its job', async () => {
    const onOpenWorkout = jest.fn();
    await renderWithApp(<CalendarScreen onOpenWorkout={onOpenWorkout} onSettings={jest.fn()} />);
    await screen.findByLabelText('Punch In / Start Workout');

    await fireEvent.press(card());
    await screen.findByLabelText('🔴 Mark Rest/Absent Day');
    expect(onOpenWorkout).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByLabelText('🔴 Mark Rest/Absent Day'));
    await screen.findByText('Streak back to 0');
    expect(onOpenWorkout).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByLabelText('Undo'));
    await fireEvent.press(await screen.findByLabelText('Punch In / Start Workout'));
    await fireEvent.press(await screen.findByLabelText('🟡 Mark Travel/Holiday'));
    await screen.findByText('Planned rest, streak kept');
    expect(onOpenWorkout).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByLabelText('Undo'));
    await fireEvent.press(await screen.findByLabelText('Punch In / Start Workout'));
    await fireEvent.press(await screen.findByLabelText('🟢 Start Workout'));
    await waitFor(() => expect(onOpenWorkout).toHaveBeenCalledWith(today));
  });
});

describe('Rest overlay', () => {
  it('appears when a set is checked, and +15s and Skip work', async () => {
    await renderWithApp(<WithBench />);
    await screen.findAllByLabelText('Log set 1');
    for (let i = 0; i < 5; i++) await fireEvent.press(screen.getByLabelText('Increase reps'));
    await fireEvent.press(screen.getAllByLabelText('Log set 1')[0]);

    await screen.findByLabelText('Rest countdown');
    expect(screen.getByLabelText('1:00 remaining')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('+15s'));
    await screen.findByLabelText(/^1:1\d remaining$/); // the clock is real, so a slow run can be a second or two past 1:15
    await fireEvent.press(screen.getByLabelText('Skip'));
    await waitFor(() => expect(screen.queryByLabelText('Rest countdown')).toBeNull());
  });
});

describe('Form guide', () => {
  it('shows cues, rejects a bad link and plays a good one', async () => {
    await renderWithApp(<WithBench />);
    await screen.findByText('• Keep elbows tucked');

    await fireEvent.press(screen.getByLabelText('Paste YouTube link'));
    await fireEvent.changeText(await screen.findByLabelText('YouTube link'), 'https://example.com/video');
    await fireEvent.press(screen.getByLabelText('Add video'));
    await screen.findByText('That is not a YouTube video link.');

    await fireEvent.changeText(screen.getByLabelText('YouTube link'), 'https://youtu.be/dQw4w9WgXcQ');
    await fireEvent.press(screen.getByLabelText('Add video'));
    await screen.findByLabelText('Exercise form video');
  });
});

describe('Monthly photo gate', () => {
  it('locks the workout and blocks a PDF with a clear warning', async () => {
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///a.pdf', name: 'a.pdf', mimeType: 'application/pdf', size: 1000, lastModified: 0 }],
      output: null,
    } as never);
    await renderWithApp(
      <MonthlyPhotoGate>
        <Text>WORKOUT OPEN</Text>
      </MonthlyPhotoGate>,
    );

    await screen.findByLabelText('Monthly photo check-in');
    expect(screen.queryByText('WORKOUT OPEN')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Choose a file'));
    await screen.findByText(/Only GIF, JPG, PNG or WebP files are allowed/);
    expect(screen.queryByText('WORKOUT OPEN')).toBeNull();
  });

  it('stays open once this month has a photo', async () => {
    const storage = require('@react-native-async-storage/async-storage');
    await storage.setItem('minimalist-gym-tracker/photos/v1', JSON.stringify({ [today]: { date: today, uri: 'file:///p.jpg', mimeType: 'image/jpeg', size: 1 } }));
    await renderWithApp(
      <MonthlyPhotoGate>
        <Text>WORKOUT OPEN</Text>
      </MonthlyPhotoGate>,
    );
    await screen.findByText('WORKOUT OPEN');
  });
});
