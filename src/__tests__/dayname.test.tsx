import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { Header } from '../components/Header';
import { dateKey } from '../lib/dates';
import { DAY_LABELS, defaultLabelFor } from '../lib/progress';
import { renderWithApp } from './helpers';

/** Whatever day name is auto-assigned today (weekday-dependent), so the tests never hardcode one. */
const todayDefault = defaultLabelFor(dateKey());

const press = async (label: string | RegExp) => fireEvent.press((await screen.findAllByLabelText(label))[0]);

describe('Custom workout day names', () => {
  it('+ opens a fresh sheet; a preset fills the field; Save & Apply creates it, applies it, and it persists', async () => {
    await renderWithApp(<Header />);
    await screen.findByLabelText(/^Workout day .+\. Tap to change\.$/); // today's default label, before anything changes

    await press('New workout day name');
    const input = await screen.findByLabelText('Workout day name');
    expect(input.props.value).toBe(''); // fresh every time

    await press('Start from “Upper”');
    expect((await screen.findByLabelText('Workout day name')).props.value).toBe('Upper');

    // Typing past the preset makes it a real custom name.
    await fireEvent.changeText(input, 'Upper Hypertrophy');
    await press('Save & Apply');

    // The header updates immediately, and the sheet closes itself.
    await waitFor(() => expect(screen.getByText('Upper Hypertrophy')).toBeTruthy());
    await waitFor(() => expect(screen.queryByLabelText('Workout day name')).toBeNull());

    // It shows up in the picker under "Your names", already selected.
    await press('Workout day Upper Hypertrophy. Tap to change.');
    await screen.findByText('Your names');
    const chip = await screen.findByLabelText('Upper Hypertrophy');
    expect(chip.props.accessibilityState.selected).toBe(true);
  });

  it('rejects blank input, and reuses (does not duplicate) an existing custom name', async () => {
    await renderWithApp(<Header />);
    await press('New workout day name');
    expect(screen.getByLabelText('Save & Apply').props.accessibilityState.disabled).toBe(true);

    await fireEvent.changeText(await screen.findByLabelText('Workout day name'), '   ');
    expect(screen.getByLabelText('Save & Apply').props.accessibilityState.disabled).toBe(true);

    await fireEvent.changeText(screen.getByLabelText('Workout day name'), 'Core & Cardio');
    await press('Save & Apply');
    await screen.findByText('Core & Cardio');

    // Same name again (different case/spacing): still only one entry in the picker.
    await press('New workout day name');
    await fireEvent.changeText(await screen.findByLabelText('Workout day name'), '  core   & cardio ');
    await screen.findByText(/You already have/);
    await press('Save & Apply');

    await press('Workout day Core & Cardio. Tap to change.');
    await screen.findByText('Your names');
    expect(screen.getAllByLabelText('Core & Cardio')).toHaveLength(1);
  });

  it('long-press arms delete; tapping elsewhere cancels; tapping the trash removes it without touching the current label', async () => {
    await renderWithApp(<Header />);
    await press('New workout day name');
    await fireEvent.changeText(await screen.findByLabelText('Workout day name'), 'Delts & Arms');
    await press('Save & Apply');
    await waitFor(() => expect(screen.getByText('Delts & Arms')).toBeTruthy());

    await press('Workout day Delts & Arms. Tap to change.');
    await screen.findByText('Your names');

    await fireEvent(screen.getByLabelText('Delts & Arms'), 'longPress');
    const cancel = await screen.findByLabelText('Cancel deleting “Delts & Arms”');
    expect(screen.queryByLabelText('Delts & Arms')).toBeNull(); // armed: the plain chip is gone

    // Tapping the armed row's label cancels back to the normal chip.
    await fireEvent.press(cancel);
    await screen.findByLabelText('Delts & Arms');
    expect(screen.queryByLabelText('Delete “Delts & Arms”')).toBeNull();

    // Arm again, this time confirm.
    await fireEvent(screen.getByLabelText('Delts & Arms'), 'longPress');
    await press('Delete “Delts & Arms”');
    await waitFor(() => expect(screen.queryByText('Your names')).toBeNull()); // no custom names left
    expect(screen.getByText('Delts & Arms')).toBeTruthy(); // still today's label — deleting the name doesn't unset it
  });

  it('a default day name can be hidden the same way, and "Restore defaults" brings it back', async () => {
    await renderWithApp(<Header />);
    await press(`Workout day ${todayDefault}. Tap to change.`);
    await screen.findByText('Defaults');
    expect(screen.queryByLabelText('Restore defaults')).toBeNull();

    // Pick any default other than today's own, so hiding it can't be confused with unselecting today.
    const other = DAY_LABELS.find((l) => l !== todayDefault)!;
    await fireEvent(screen.getByLabelText(other), 'longPress');
    await press(`Delete “${other}”`);

    // Gone from the grid; a reversible "Restore defaults" link appears instead of a permanent delete.
    await waitFor(() => expect(screen.queryByLabelText(other)).toBeNull());
    await screen.findByLabelText('Restore defaults');

    await press('Restore defaults');
    await screen.findByLabelText(other);
    expect(screen.queryByLabelText('Restore defaults')).toBeNull();
  });

  it('hiding every default shows a message instead of an empty grid, and today keeps its label', async () => {
    await renderWithApp(<Header />);
    await press(`Workout day ${todayDefault}. Tap to change.`);
    await screen.findByText('Defaults');

    for (const l of DAY_LABELS) {
      await fireEvent(screen.getByLabelText(l), 'longPress');
      await press(`Delete “${l}”`);
      await waitFor(() => expect(screen.queryByLabelText(l)).toBeNull());
    }

    await screen.findByText('All built-in names are hidden.');
    await press('Close');
    expect(screen.getByText(todayDefault)).toBeTruthy(); // hiding the defaults never touches today's own label
  });
});
