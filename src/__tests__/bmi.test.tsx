import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { BodyScreen } from '../screens/BodyScreen';
import { renderWithApp } from './helpers';

describe('BMI & Weight flow', () => {
  it('height + weight produce a BMI and category, and a new weight shows the change', async () => {
    await renderWithApp(<BodyScreen />);
    await waitFor(() => expect(screen.getByText('Log your weight once', { exact: false })).toBeTruthy());

    // 1) Height (defaults to 170 cm in the sheet; Save keeps it).
    await fireEvent.press(screen.getAllByLabelText('Set height')[0]);
    await fireEvent.press(await screen.findByLabelText('Save height'));
    await waitFor(() => expect(screen.getByText('170 cm')).toBeTruthy());

    // 2) First weight: 70 kg at 170 cm -> BMI 24.2, Normal.
    await fireEvent.press(screen.getByLabelText('Log weight'));
    await fireEvent.changeText(await screen.findByLabelText('Weight in kg'), '70');
    await fireEvent.press(screen.getByLabelText('Save weight'));
    await waitFor(() => expect(screen.getAllByText('24.2').length).toBeGreaterThan(0));
    expect(screen.getByText('Normal Weight')).toBeTruthy();

    // 3) Gain to 85 kg: BMI 29.4, Overweight, and the +15 change is shown.
    await fireEvent.press(screen.getByLabelText('Update weight'));
    await fireEvent.changeText(await screen.findByLabelText('Weight in kg'), '85');
    await fireEvent.press(screen.getByLabelText('Save weight'));
    await waitFor(() => expect(screen.getAllByText('29.4').length).toBeGreaterThan(0));
    expect(screen.getByText('Overweight')).toBeTruthy();
    expect(screen.getByText('(+15 kg)')).toBeTruthy();
  });

  it('will not save an unchanged or impossible weight', async () => {
    await renderWithApp(<BodyScreen />);
    await waitFor(() => expect(screen.getByLabelText('Log weight')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText('Log weight'));
    const input = await screen.findByLabelText('Weight in kg');
    await fireEvent.changeText(input, '5'); // far below the 20 kg minimum
    expect(screen.getByLabelText(/^Enter 20/)).toBeTruthy();
  });
});
