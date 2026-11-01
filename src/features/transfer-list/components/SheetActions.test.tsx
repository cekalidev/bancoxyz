import { render, screen, userEvent, within } from '@testing-library/react-native';

import { spacing } from '@/theme';

import { SheetActions } from './SheetActions';

const APPLY_LABEL = 'Aplicar';
const REMOVE_LABEL = 'Quitar filtro';

describe('SheetActions', () => {
  it('Aplicar siempre y Quitar filtro solo si el filtro está aplicado', async () => {
    const onApply = jest.fn();
    const onRemove = jest.fn();
    const user = userEvent.setup();
    const { rerender } = await render(<SheetActions filterApplied={false} onApply={onApply} onRemove={onRemove} />);

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByTestId('button-gradient')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: REMOVE_LABEL })).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: APPLY_LABEL }));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onRemove).not.toHaveBeenCalled();

    await rerender(<SheetActions filterApplied onApply={onApply} onRemove={onRemove} />);
    const apply = screen.getByRole('button', { name: APPLY_LABEL });
    const remove = screen.getByRole('button', { name: REMOVE_LABEL });

    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(within(apply).getByTestId('button-gradient')).toBeOnTheScreen();
    expect(within(remove).queryByTestId('button-gradient')).not.toBeOnTheScreen();
    expect(remove).toHaveStyle({ backgroundColor: 'transparent' });
    expect(screen.root).toHaveStyle({ gap: spacing.xs });

    await user.press(remove);

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledTimes(1);
  });
});
