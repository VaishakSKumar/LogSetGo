import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { BmiPage } from '../screens/account/BmiPage';
import { renderWithApp } from './helpers';

const page = <BmiPage onBack={() => {}} onWeightProgress={() => {}} />;

describe('BMI page', () => {
  it('height + weight produce a BMI and band, and the goal shows BMI at goal and what is left', async () => {
    await renderWithApp(page);
    await screen.findByText('Add your weight and height to see your BMI.');

    await fireEvent.press(screen.getByLabelText('Add height'));
    await fireEvent.press(await screen.findByLabelText('Save height'));
    await waitFor(() => expect(screen.getByText('170 cm')).toBeTruthy());

    await fireEvent.press(screen.getByLabelText('Add weight'));
    await fireEvent.changeText(await screen.findByLabelText('Weight in kg'), '85');
    await fireEvent.press(screen.getByLabelText('Save weight'));
    await waitFor(() => expect(screen.getByText('29.4')).toBeTruthy());
    expect(screen.getByText('Overweight')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Target goal weight'), '70');
    await screen.findByText('BMI at goal: 24.2, Healthy');
    await screen.findByText('15 kg to lose');

    await fireEvent.changeText(screen.getByLabelText('Target goal weight'), '85');
    await screen.findByText('You have reached your goal');
  });

  it('rejects a goal outside 30 to 300 kg', async () => {
    await renderWithApp(page);
    await fireEvent.changeText(await screen.findByLabelText('Target goal weight'), '12');
    await screen.findByText('Enter a weight from 30 to 300 kg');
  });

  it('will not save an impossible weight', async () => {
    await renderWithApp(page);
    await fireEvent.press(await screen.findByLabelText('Add weight'));
    await fireEvent.changeText(await screen.findByLabelText('Weight in kg'), '5'); // far below the 20 kg minimum
    expect(screen.getByLabelText(/^Enter 20/)).toBeTruthy();
  });
});
