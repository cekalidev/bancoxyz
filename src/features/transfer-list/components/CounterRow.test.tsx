import { render, screen, userEvent } from '@testing-library/react-native';

import { colors, spacing, typography } from '@/theme';

import { CounterRow } from './CounterRow';

const TEXT = '1 de 3 transferencias';
const NEXT_TEXT = '3 transferencias';
const CLEAR_LABEL = 'Limpiar filtros';

describe('CounterRow', () => {
  it('el contador es una región cortés con el texto recibido', async () => {
    const { rerender } = await render(<CounterRow text={TEXT} showClear={false} onClear={jest.fn()} />);
    const counter = screen.getByText(TEXT);

    expect(counter).toHaveProp('accessibilityLiveRegion', 'polite');
    expect(counter).toHaveStyle({ ...typography.caption, color: colors.textSecondary });
    expect(counter.parent).toHaveStyle({ flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.sm });

    await rerender(<CounterRow text={NEXT_TEXT} showClear={false} onClear={jest.fn()} />);

    expect(screen.queryByText(TEXT)).not.toBeOnTheScreen();
    expect(screen.getByText(NEXT_TEXT)).toHaveProp('accessibilityLiveRegion', 'polite');
  });

  it('Limpiar filtros aparece solo si se pide y avisa con onClear', async () => {
    const onClear = jest.fn();
    const user = userEvent.setup();
    const { rerender } = await render(<CounterRow text={TEXT} showClear={false} onClear={onClear} />);

    expect(screen.queryByRole('button', { name: CLEAR_LABEL })).not.toBeOnTheScreen();

    await rerender(<CounterRow text={TEXT} showClear onClear={onClear} />);
    await user.press(screen.getByRole('button', { name: CLEAR_LABEL }));

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.getByText(TEXT)).toBeOnTheScreen();
  });
});
