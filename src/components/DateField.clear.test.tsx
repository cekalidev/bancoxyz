import { render, screen, userEvent, within } from '@testing-library/react-native';
import { Pressable, StyleSheet } from 'react-native';

import { DateField } from '@/components/DateField';
import { colors, spacing, typography } from '@/theme';

const LABEL = 'Desde';
const TEXT = '1 jun 2024';
const SPOKEN = 'Fecha desde: 1 de junio de 2024';
const CLEAR = 'Borrar fecha desde';
const HIDDEN = { includeHiddenElements: true };

function hintNodes() {
  return screen.container.queryAll((node) => {
    const style = StyleSheet.flatten(node.props.style);

    return (
      style?.marginTop === spacing.xs &&
      style?.color === colors.textSecondary &&
      style?.fontSize === typography.caption.fontSize
    );
  });
}

type Node = ReturnType<typeof screen.getByText>;

function calendarPathsIn(node: Node) {
  return node.queryAll((child) => typeof child.props.d === 'string');
}

function clearButton(onPress = jest.fn()) {
  return <Pressable accessibilityRole="button" accessibilityLabel={CLEAR} onPress={onPress} />;
}

describe('DateField sin ayuda', () => {
  it('sin ayuda no pinta la ayuda', async () => {
    await render(<DateField label={LABEL} text={TEXT} spokenLabel={SPOKEN} onPress={jest.fn()} />);

    const texts = screen.container.queryAll((node) => node.type === 'Text');

    expect(screen.getByRole('button', { name: SPOKEN })).toBeOnTheScreen();
    expect(screen.getByText(LABEL, HIDDEN)).toBeOnTheScreen();
    expect(screen.getByText(TEXT)).toBeOnTheScreen();
    expect(texts).toHaveLength(2);
    expect(hintNodes()).toHaveLength(0);
  });
});

describe('DateField sin botón de borrar', () => {
  it('sin botón de borrar el campo es el de siempre', async () => {
    const onPress = jest.fn();
    await render(<DateField label={LABEL} text={TEXT} spokenLabel={SPOKEN} onPress={onPress} />);

    const field = screen.getByRole('button', { name: SPOKEN });

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(within(field).getByText(TEXT)).toBeOnTheScreen();
    expect(calendarPathsIn(field).length).toBeGreaterThan(0);

    await userEvent.setup().press(calendarPathsIn(field)[0]);

    expect(onPress).toHaveBeenCalledTimes(1);

    await screen.rerender(
      <DateField label={LABEL} text={TEXT} spokenLabel={SPOKEN} onPress={onPress} right={null} />,
    );

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(calendarPathsIn(screen.getByRole('button', { name: SPOKEN })).length).toBeGreaterThan(0);
  });
});

describe('DateField con botón de borrar', () => {
  it('con botón de borrar este es un elemento aparte, después del campo y antes del calendario', async () => {
    const onPress = jest.fn();
    const onClear = jest.fn();
    await render(
      <DateField label={LABEL} text={TEXT} spokenLabel={SPOKEN} onPress={onPress} right={clearButton(onClear)} />,
    );

    const field = screen.getByRole('button', { name: SPOKEN });
    const clear = screen.getByRole('button', { name: CLEAR });
    const nodes = screen.container.queryAll(() => true);
    const calendar = calendarPathsIn(screen.container)[0];
    const buttons = screen.getAllByRole('button');

    expect(within(field).queryByRole('button', { name: CLEAR })).not.toBeOnTheScreen();
    expect(within(field).getByText(TEXT)).toBeOnTheScreen();
    expect(calendarPathsIn(field)).toHaveLength(0);
    expect(buttons).toHaveLength(2);
    expect(buttons.indexOf(field)).toBeLessThan(buttons.indexOf(clear));
    expect(nodes.indexOf(field)).toBeLessThan(nodes.indexOf(clear));
    expect(nodes.indexOf(clear)).toBeLessThan(nodes.indexOf(calendar));

    const user = userEvent.setup();
    await user.press(clear);

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();

    await user.press(field);

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('DateField con calendario pulsable', () => {
  it('el calendario también abre el selector y no se anuncia', async () => {
    const onPress = jest.fn();
    await render(
      <DateField label={LABEL} text={TEXT} spokenLabel={SPOKEN} onPress={onPress} right={clearButton()} />,
    );

    const calendar = calendarPathsIn(screen.container)[0];
    const [wrapper] = screen.container.queryAll(
      (node) =>
        node.props.importantForAccessibility === 'no-hide-descendants' &&
        typeof node.props.onClick === 'function' &&
        calendarPathsIn(node).length > 0,
    );

    await userEvent.setup().press(calendar);

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(wrapper?.props.accessible).toBe(false);
    expect(wrapper?.props.accessibilityRole).toBeUndefined();
    expect(wrapper?.props.role).toBeUndefined();
    expect(within(wrapper).queryByRole('button')).not.toBeOnTheScreen();
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByRole('button', { name: SPOKEN })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: CLEAR })).toBeOnTheScreen();
  });
});
