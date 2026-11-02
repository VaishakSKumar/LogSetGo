import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { addDays, dateKey } from '../lib/dates';
import { clockTime, defaultLeave, leaveBounds, missedVisits, parseVisits, spentTime, stepLeave } from '../lib/visits';
import { CalendarScreen } from '../screens/CalendarScreen';
import { renderWithApp } from './helpers';

const today = dateKey();
const yesterday = addDays(today, -1);
const MARKS = 'minimalist-gym-tracker/attendance/v1';
const VISITS = 'minimalist-gym-tracker/attendance/visits/v1';
const OLD_PUNCHES = 'minimalist-gym-tracker/attendance/punches/v1';

const at = (date: string, h: number, m = 0) => {
  const [y, mo, d] = date.split('-').map(Number);
  return new Date(y, mo - 1, d, h, m).getTime();
};
const screenApp = () => renderWithApp(<CalendarScreen onOpenWorkout={() => {}} onSettings={() => {}} />);
const stored = async () => JSON.parse((await AsyncStorage.getItem(VISITS)) ?? '{}');

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Visit times', () => {
  it('keeps a leaving time after the punch-in and before midnight', () => {
    const start = at('2026-11-02', 18, 42);
    expect(defaultLeave(start)).toBe(at('2026-11-02', 19, 42));
    expect(stepLeave(start, start, -1)).toBe(leaveBounds(start).min);
    expect(stepLeave(start, at('2026-11-02', 23, 50), 1)).toBe(at('2026-11-02', 23, 59));
    expect(spentTime(start, at('2026-11-02', 19, 47))).toBe('1:05');
    expect(spentTime(at('2026-11-02', 8, 17) + 3_000, at('2026-11-02', 13, 44))).toBe('5:27');
    expect(clockTime(start)).toBe('6:42 pm');
  });

  it('still works for a punch-in moments before midnight', () => {
    const start = at('2026-11-02', 23, 58);
    expect(defaultLeave(start)).toBe(at('2026-11-02', 23, 59));
    expect(leaveBounds(start).min).toBe(leaveBounds(start).max);
  });

  it('turns an old punch-in into a visit, and asks about Present days only, oldest first', () => {
    const visits = parseVisits(null, JSON.stringify({ '2026-11-01': 5 }));
    expect(visits['2026-11-01']).toEqual({ in: 5 });
    const days = { a: { in: 1 }, b: { in: 2, out: 3 }, c: { in: 4, noOut: true }, d: { in: 5 } };
    const named = { '2026-10-30': days.d, '2026-10-29': days.a, '2026-10-28': days.b, '2026-10-27': days.c, '2026-10-26': { in: 6 } };
    const present = { '2026-10-30': 'present', '2026-10-29': 'present', '2026-10-28': 'present', '2026-10-27': 'present', '2026-10-26': 'absent' };
    expect(missedVisits(named, present, '2026-11-01').map((v) => v.date)).toEqual(['2026-10-29', '2026-10-30']);
  });
});

describe('Punch out', () => {
  const punchedIn = async () => {
    await AsyncStorage.setItem(MARKS, JSON.stringify({ [today]: 'present' }));
    await AsyncStorage.setItem(VISITS, JSON.stringify({ [today]: { in: Date.now() - 60_000 } }));
  };

  it('freezes the time, keeps the day Present, and Undo starts it again', async () => {
    await punchedIn();
    await screenApp();
    await fireEvent.press(await screen.findByLabelText('Punch Out'));
    await screen.findByText('Time in the gym');
    expect(screen.getByText('You can still log sets today.')).toBeTruthy();
    expect(screen.getByText('Present')).toBeTruthy();
    expect(screen.queryByLabelText('Undo punch-in')).toBeNull();
    await waitFor(async () => expect((await stored())[today].out).toEqual(expect.any(Number)));

    await fireEvent.press(screen.getByLabelText('Undo punch-out'));
    await screen.findByLabelText('Punch Out');
    await waitFor(async () => expect((await stored())[today].out).toBeUndefined());
  });

  it('picks up a punch-in saved before punch-out existed', async () => {
    await AsyncStorage.setItem(MARKS, JSON.stringify({ [today]: 'present' }));
    await AsyncStorage.setItem(OLD_PUNCHES, JSON.stringify({ [today]: Date.now() - 60_000 }));
    await screenApp();
    await screen.findByLabelText('Punch Out');
  });
});

describe('Missed punch-out', () => {
  const missedYesterday = async () => {
    await AsyncStorage.setItem(MARKS, JSON.stringify({ [yesterday]: 'present' }));
    await AsyncStorage.setItem(VISITS, JSON.stringify({ [yesterday]: { in: at(yesterday, 18, 42) } }));
  };

  it('asks when you left, and saves it as approximate', async () => {
    await missedYesterday();
    await screenApp();
    await screen.findByText('You didn’t punch out');
    expect(screen.getByText('About 1:00 in the gym')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('15 minutes later'));
    await screen.findByText('About 1:15 in the gym');
    await fireEvent.press(screen.getByLabelText('Save time'));
    await screen.findByText('Saved: 1:15 in the gym yesterday.');
    expect(screen.queryByText('You didn’t punch out')).toBeNull();
    await waitFor(async () => expect((await stored())[yesterday]).toEqual({ in: at(yesterday, 18, 42), out: at(yesterday, 19, 57), approx: true }));
  });

  it('stops asking after I don’t remember, with no time saved', async () => {
    await missedYesterday();
    await screenApp();
    await fireEvent.press(await screen.findByText('I don’t remember'));
    await waitFor(() => expect(screen.queryByText('You didn’t punch out')).toBeNull());
    await waitFor(async () => expect((await stored())[yesterday]).toEqual({ in: at(yesterday, 18, 42), noOut: true }));
  });

  it('asks about each missed day in turn', async () => {
    const earlier = addDays(today, -3);
    await AsyncStorage.setItem(MARKS, JSON.stringify({ [yesterday]: 'present', [earlier]: 'present' }));
    await AsyncStorage.setItem(VISITS, JSON.stringify({ [yesterday]: { in: at(yesterday, 18) }, [earlier]: { in: at(earlier, 7) } }));
    await screenApp();
    await screen.findByText(/^On .* you punched in at 7:00 am/);
    await fireEvent.press(screen.getByLabelText('Save time'));
    await screen.findByText(/^Yesterday you punched in at 6:00 pm/);
  });
});
