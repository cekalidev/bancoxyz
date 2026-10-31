import { createRef } from 'react';
import { fireEvent, render, screen, userEvent, within } from '@testing-library/react-native';
import { AccessibilityInfo, Platform, processColor, StyleSheet, Text, TextInput } from 'react-native';
import type { TextInputInstance } from 'react-native';

import { AlertIcon } from '@/components/icons/AlertIcon';
import { TextField } from '@/components/TextField';
import type { TextFieldProps } from '@/components/TextField';
import { borders, colors, layout, radii, spacing, typography } from '@/theme';

const LABEL = 'Correo electrónico';
const ERROR = 'Escribe un correo válido.';
const HIDDEN = { includeHiddenElements: true };

const restBox = { borderWidth: borders.regular, borderColor: colors.border, backgroundColor: colors.background };
const focusBox = { borderWidth: borders.strong, borderColor: colors.focus, backgroundColor: colors.background };
const errorBox = { borderWidth: borders.strong, borderColor: colors.error, backgroundColor: colors.background };
const disabledBox = {
  borderWidth: borders.regular,
  borderColor: colors.borderSubtle,
  backgroundColor: colors.surface,
};

function fieldProps(props: Partial<TextFieldProps> = {}): TextFieldProps {
  return { label: LABEL, value: '', onChangeText: jest.fn(), ...props };
}

async function renderField(props: Partial<TextFieldProps> = {}) {
  await render(<TextField {...fieldProps(props)} />);
}

function getInput() {
  return screen.getByLabelText(LABEL);
}

async function focusInput() {
  await userEvent.setup().type(getInput(), 'a', { skipBlur: true });
}

function getFieldBox() {
  const boxes = screen.container.queryAll(
    (node) => (StyleSheet.flatten(node.props.style)?.borderWidth ?? 0) > 0,
  );

  expect(boxes).toHaveLength(1);
  return boxes[0];
}

afterEach(() => {
  jest.restoreAllMocks();
});

function expectLabelVisibleButHiddenFromReader() {
  const label = screen.getByText(LABEL, HIDDEN);

  expect(label).toHaveStyle({ ...typography.label, color: colors.text });
  expect(label).toHaveProp('accessibilityElementsHidden', true);
  expect(label).toHaveProp('importantForAccessibility', 'no');
  expect(screen.queryByText(LABEL)).not.toBeOnTheScreen();
}

function expectRestAppearance() {
  expect(getFieldBox()).toHaveStyle({
    ...restBox,
    minHeight: layout.inputHeight,
    borderRadius: radii.input,
    paddingHorizontal: spacing.md,
  });
  expect(getInput()).toHaveStyle({ ...typography.body, color: colors.text });
}

describe('TextField aspecto', () => {
  it('muestra la etiqueta visible y los bordes de reposo, foco, error y deshabilitado', async () => {
    await renderField();
    expectLabelVisibleButHiddenFromReader();
    expectRestAppearance();

    await focusInput();
    expect(getFieldBox()).toHaveStyle(focusBox);

    await fireEvent(getInput(), 'blur');
    expect(getFieldBox()).toHaveStyle(restBox);

    await screen.rerender(<TextField {...fieldProps({ error: 'Escribe tu correo.' })} />);
    expect(getFieldBox()).toHaveStyle(errorBox);

    await focusInput();
    expect(getFieldBox()).toHaveStyle(errorBox);

    await screen.rerender(<TextField {...fieldProps({ editable: false })} />);
    expect(getFieldBox()).toHaveStyle(disabledBox);
    expect(getInput()).toHaveProp('editable', false);
    expect(getInput()).toHaveStyle({ color: colors.disabledText });
  });

  it('muestra el texto de ayuda con el color del tema y la ranura derecha dentro del campo', async () => {
    await renderField({ placeholder: 'nombre@ejemplo.com', right: <Text>Ranura derecha</Text> });

    expect(screen.getByPlaceholderText('nombre@ejemplo.com')).toHaveProp(
      'placeholderTextColor',
      colors.placeholder,
    );

    const box = within(getFieldBox());

    expect(box.getByLabelText(LABEL)).toBeOnTheScreen();
    expect(box.getByText('Ranura derecha')).toBeOnTheScreen();
    expect(getFieldBox()).toHaveStyle({ flexDirection: 'row', alignItems: 'center' });
  });
});

const forwardedProps = {
  keyboardType: 'email-address',
  autoCapitalize: 'none',
  autoCorrect: false,
  autoComplete: 'email',
  textContentType: 'emailAddress',
  returnKeyType: 'next',
  submitBehavior: 'submit',
  secureTextEntry: true,
} as const satisfies Partial<TextFieldProps>;

function expectForwardedProps() {
  for (const [name, expected] of Object.entries(forwardedProps)) {
    expect(getInput()).toHaveProp(name, expected);
  }
}

describe('TextField reenvío al campo de texto', () => {
  it('reenvía la referencia, las propiedades y los eventos al campo de texto', async () => {
    const focus = jest.spyOn(TextInput.prototype, 'focus');
    const inputRef = createRef<TextInputInstance>();
    const onChangeText = jest.fn();
    const onSubmitEditing = jest.fn();

    await renderField({ ...forwardedProps, inputRef, value: 'ana@ejemplo.com', onChangeText, onSubmitEditing });
    expectForwardedProps();
    expect(getInput()).toHaveProp('value', 'ana@ejemplo.com');

    await userEvent.setup().type(getInput(), 'x', { submitEditing: true });
    expect(onChangeText).toHaveBeenCalledWith('ana@ejemplo.comx');
    expect(onSubmitEditing).toHaveBeenCalledTimes(1);

    inputRef.current?.focus();
    expect(focus).toHaveBeenCalledTimes(1);
    expect(focus.mock.contexts[0]).toBe(inputRef.current);
  });
});

type Node = ReturnType<typeof getErrorRegion>;

function getErrorRegion() {
  const regions = screen.container.queryAll((node) => node.props.accessibilityLiveRegion === 'polite');

  expect(regions).toHaveLength(1);
  return regions[0];
}

function pathsOf(node: Node) {
  return node.queryAll((child) => typeof child.props.d === 'string').map((child) => child.props.d);
}

function strokeColorsOf(node: Node) {
  return node.queryAll((child) => child.props.stroke !== undefined).map((child) => child.props.stroke.payload);
}

async function pathsOfAlertIcon() {
  const { root, unmount } = await render(<AlertIcon color={colors.text} />);
  const paths = root ? pathsOf(root) : [];

  await unmount();
  return paths;
}

function expectRegionWithoutBox(region: Node) {
  const boxKeys = Object.keys(StyleSheet.flatten(region.props.style) ?? {}).filter((key) =>
    /^(height|minHeight|margin|padding|gap)/.test(key),
  );

  expect(region).toBeEmptyElement();
  expect(boxKeys).toEqual([]);
}

function expectBelowField(region: Node) {
  const nodes = screen.container.queryAll(() => true);

  expect(nodes.indexOf(getFieldBox())).toBeLessThan(nodes.indexOf(region));
  expect(within(getFieldBox()).queryByText(ERROR)).not.toBeOnTheScreen();
}

describe('TextField error', () => {
  it('el error del campo vive en una región que se anuncia con su icono', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    announce.mockClear();
    const iconPaths = await pathsOfAlertIcon();
    await renderField();
    const region = getErrorRegion();

    expectRegionWithoutBox(region);
    expect(announce).not.toHaveBeenCalled();

    await screen.rerender(<TextField {...fieldProps({ error: ERROR })} />);

    expect(getErrorRegion()).toBe(region);
    expect(within(region).getByText(ERROR)).toHaveStyle({ ...typography.caption, color: colors.error });
    expect(pathsOf(region)).toEqual(iconPaths);
    expect(strokeColorsOf(region)).toContain(processColor(colors.error));
    expectBelowField(region);
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith(ERROR);

    await screen.rerender(<TextField {...fieldProps()} />);

    expectRegionWithoutBox(region);
  });
});
