import { render, screen, userEvent, within } from '@testing-library/react-native';

import { Button } from '@/components/Button';

const LABEL = 'Confirmar transferencia';
const BUSY_LABEL = 'Transfiriendo…';

describe('Button ocupado', () => {
  it('ocupado se anuncia deshabilitado y ocupado con su texto de progreso y sin indicador', async () => {
    const onPress = jest.fn();
    await render(<Button label={LABEL} busy busyLabel={BUSY_LABEL} onPress={onPress} />);

    const button = screen.getByRole('button', { name: BUSY_LABEL });

    expect(button.props.accessibilityState).toEqual(expect.objectContaining({ busy: true, disabled: true }));
    expect(within(button).getByText(BUSY_LABEL)).toBeOnTheScreen();
    expect(screen.queryByText(LABEL)).not.toBeOnTheScreen();
    expect(screen.queryByRole('progressbar')).not.toBeOnTheScreen();
    expect(within(button).queryByTestId('button-gradient')).not.toBeOnTheScreen();

    await userEvent.setup().press(button);

    expect(onPress).not.toHaveBeenCalled();
  });
});
