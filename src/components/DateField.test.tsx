import { createRef } from 'react';
import { render, screen, userEvent, within } from '@testing-library/react-native';
import { processColor, StyleSheet } from 'react-native';
import type { PressableInstance } from 'react-native';

import { DateField } from '@/components/DateField';
import type { DateFieldProps } from '@/components/DateField';
import { CalendarIcon } from '@/components/icons/CalendarIcon';
import { borders, colors, layout, radii, spacing, typography } from '@/theme';

const LABEL = 'Fecha de la transferencia';
const TEXT = 'Hoy, 31/10/2026';
const SPOKEN = 'Fecha de la transferencia: hoy, 31 de octubre de 2026';
const HINT = 'Elige una fecha futura para programarla.';
const ERROR = 'Elige una fecha de hoy en adelante.';
const HIDDEN = { includeHiddenElements: true };
const MIN_TOUCH_AREA = 48;

const restBox = { borderWidth: borders.regular, borderColor: colors.border, backgroundColor: colors.background };
const errorBox = { borderWidth: borders.strong, borderColor: colors.error, backgroundColor: colors.background };

function fieldProps(props: Partial<DateFieldProps> = {}): DateFieldProps {
  return {
    label: LABEL,
    text: TEXT,
    spokenLabel: SPOKEN,
    hint: { text: HINT },
    onPress: jest.fn(),
    ...props,
  };
}

async function renderField(props: Partial<DateFieldProps> = {}) {
  await render(<DateField {...fieldProps(props)} />);
}

function getButton() {
  return screen.getByRole('button', { name: SPOKEN });
}

type Node = ReturnType<typeof getButton>;

function pathsOf(node: Node) {
  return node.queryAll((child) => typeof child.props.d === 'string').map((child) => child.props.d);
}

function strokeColorsOf(node: Node) {
  return node.queryAll((child) => child.props.stroke !== undefined).map((child) => child.props.stroke.payload);
}

async function pathsOfCalendarIcon() {
  const { root, unmount } = await render(<CalendarIcon color={colors.text} />);
  const paths = root ? pathsOf(root) : [];

  await unmount();
  return paths;
}

describe('DateField como botón', () => {
  it('es un botón con su etiqueta hablada y la pista Abre el calendario', async () => {
    const onPress = jest.fn();
    const fieldRef = createRef<PressableInstance>();
    await renderField({ onPress, fieldRef });

    const button = getButton();
    const label = screen.getByText(LABEL, HIDDEN);

    expect(button).toHaveProp('accessibilityHint', 'Abre el calendario');
    expect(fieldRef.current).not.toBeNull();
    expect(label).toHaveStyle({ ...typography.label, color: colors.text, marginBottom: spacing.xs });
    expect(label).toHaveProp('accessibilityElementsHidden', true);
    expect(label).toHaveProp('importantForAccessibility', 'no');
    expect(screen.queryByText(LABEL)).not.toBeOnTheScreen();
    expect(within(button).getByText(TEXT)).toHaveStyle({
      ...typography.body,
      color: colors.text,
      flexShrink: 1,
    });
    expect(screen.getByText(HINT)).toBeOnTheScreen();

    await userEvent.setup().press(button);

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('DateField aspecto', () => {
  it('muestra el icono de calendario y el estado de error', async () => {
    const iconPaths = await pathsOfCalendarIcon();
    await renderField();

    const button = getButton();
    const nodes = screen.container.queryAll(() => true);
    const icon = button.queryAll((child) => typeof child.props.d === 'string')[0];

    expect(button).toHaveStyle({
      ...restBox,
      borderRadius: radii.input,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    });
    expect(pathsOf(button)).toEqual(iconPaths);
    expect(strokeColorsOf(button)).toContain(processColor(colors.textSecondary));
    expect(nodes.indexOf(within(button).getByText(TEXT))).toBeLessThan(nodes.indexOf(icon));

    await screen.rerender(<DateField {...fieldProps({ error: ERROR })} />);

    expect(getButton()).toHaveStyle(errorBox);
    expect(screen.getByText(ERROR)).toBeOnTheScreen();
    expect(screen.queryByText(HINT)).not.toBeOnTheScreen();

    await screen.rerender(<DateField {...fieldProps()} />);

    expect(getButton()).toHaveStyle(restBox);
    expect(screen.getByText(HINT)).toBeOnTheScreen();
    expect(screen.queryByText(ERROR)).not.toBeOnTheScreen();
  });
});

describe('DateField área táctil', () => {
  it('el campo de fecha mide al menos 48 de alto', async () => {
    await renderField();

    const { minHeight } = StyleSheet.flatten(getButton().props.style);

    expect(minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_AREA);
    expect(getButton()).toHaveStyle({ minHeight: layout.inputHeight });
  });
});
