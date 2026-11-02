import { createRef } from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import { processColor } from 'react-native';
import type { PressableInstance } from 'react-native';

import { ClearButton } from '@/components/ClearButton';
import { CloseIcon } from '@/components/icons/CloseIcon';
import { pathsOf, pathsOfIcon, strokeColorsOf } from '@/test/iconPaths';
import { colors, layout } from '@/theme';

const LABEL = 'Borrar búsqueda';

function getButton() {
  return screen.getByRole('button', { name: LABEL });
}

describe('ClearButton', () => {
  it('es un botón de 48 × 48 con su etiqueta', async () => {
    const closePaths = await pathsOfIcon(CloseIcon, colors.textSecondary);
    const onPress = jest.fn();
    const buttonRef = createRef<PressableInstance>();
    const user = userEvent.setup();

    await render(<ClearButton label={LABEL} onPress={onPress} buttonRef={buttonRef} />);

    const button = getButton();

    expect(button).toHaveAccessibleName(LABEL);
    expect(button).toHaveStyle({
      width: layout.minTouch,
      height: layout.minTouch,
      alignItems: 'center',
      justifyContent: 'center',
    });
    expect(pathsOf(button)).toEqual(closePaths);
    expect(strokeColorsOf(button)).toContain(processColor(colors.textSecondary));
    expect(buttonRef.current).not.toBeNull();

    await user.press(button);

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
