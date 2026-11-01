import { createRef } from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import { processColor } from 'react-native';
import type { PressableInstance } from 'react-native';

import { ClearButton } from '@/components/ClearButton';
import { CloseIcon } from '@/components/icons/CloseIcon';
import { colors, layout } from '@/theme';

const LABEL = 'Borrar búsqueda';

type Node = ReturnType<typeof getButton>;

function getButton() {
  return screen.getByRole('button', { name: LABEL });
}

function pathsOf(node: Node) {
  return node.queryAll((child) => typeof child.props.d === 'string').map((child) => child.props.d);
}

function strokeColorsOf(node: Node) {
  return node.queryAll((child) => child.props.stroke !== undefined).map((child) => child.props.stroke.payload);
}

async function pathsOfCloseIcon() {
  const { root, unmount } = await render(<CloseIcon color={colors.textSecondary} />);
  const paths = root ? pathsOf(root) : [];

  await unmount();
  return paths;
}

describe('ClearButton', () => {
  it('es un botón de 48 × 48 con su etiqueta', async () => {
    const closePaths = await pathsOfCloseIcon();
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
