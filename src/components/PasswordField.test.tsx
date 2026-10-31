import { render, screen, userEvent } from '@testing-library/react-native';
import type { ComponentType } from 'react';
import { useState } from 'react';
import { processColor } from 'react-native';

import { EyeIcon } from '@/components/icons/EyeIcon';
import { EyeOffIcon } from '@/components/icons/EyeOffIcon';
import { PasswordField } from '@/components/PasswordField';
import { colors, layout } from '@/theme';

const LABEL = 'Contraseña';
const TYPED = 'Secreta 1';

type Node = ReturnType<typeof getToggle>;

function Harness({ onChangeText }: { onChangeText: (text: string) => void }) {
  const [value, setValue] = useState('');

  return (
    <PasswordField
      label={LABEL}
      value={value}
      onChangeText={(text) => {
        setValue(text);
        onChangeText(text);
      }}
    />
  );
}

function getInput() {
  return screen.getByLabelText(LABEL);
}

function getToggle() {
  return screen.getByRole('button');
}

function pathsOf(node: Node) {
  return node.queryAll((child) => typeof child.props.d === 'string').map((child) => child.props.d);
}

function strokeColorsOf(node: Node) {
  return node.queryAll((child) => child.props.stroke !== undefined).map((child) => child.props.stroke.payload);
}

async function pathsOfIcon(Icon: ComponentType<{ color: string }>) {
  const { root, unmount } = await render(<Icon color={colors.textSecondary} />);
  const paths = root ? pathsOf(root) : [];

  await unmount();
  return paths;
}

function expectToggleSized() {
  expect(getToggle()).toHaveStyle({ width: layout.minTouch, height: layout.minTouch });
}

function expectState(hidden: boolean, label: string, iconPaths: string[]) {
  expect(getInput()).toHaveProp('secureTextEntry', hidden);
  expect(getToggle()).toHaveAccessibleName(label);
  expect(pathsOf(getToggle())).toEqual(iconPaths);
  expect(strokeColorsOf(getToggle())).toContain(processColor(colors.textSecondary));
  expectToggleSized();
}

describe('PasswordField', () => {
  it('alterna mostrar y ocultar la contraseña con su etiqueta sin perder el texto', async () => {
    const eyePaths = await pathsOfIcon(EyeIcon);
    const eyeOffPaths = await pathsOfIcon(EyeOffIcon);
    const onChangeText = jest.fn();
    const user = userEvent.setup();

    await render(<Harness onChangeText={onChangeText} />);
    expectState(true, 'Mostrar contraseña', eyePaths);

    await user.type(getInput(), TYPED, { skipBlur: true });
    const typingCalls = onChangeText.mock.calls.length;

    expect(getInput()).toHaveDisplayValue(TYPED);

    await user.press(getToggle());
    expectState(false, 'Ocultar contraseña', eyeOffPaths);
    expect(getInput()).toHaveDisplayValue(TYPED);

    await user.press(getToggle());
    expectState(true, 'Mostrar contraseña', eyePaths);
    expect(getInput()).toHaveDisplayValue(TYPED);
    expect(onChangeText).toHaveBeenCalledTimes(typingCalls);
    expect(onChangeText).toHaveBeenLastCalledWith(TYPED);
  });
});
