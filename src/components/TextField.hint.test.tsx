import { render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { TextField } from '@/components/TextField';
import type { TextFieldProps } from '@/components/TextField';
import { colors, spacing, typography } from '@/theme';

const LABEL = 'Valor';
const HINT = 'Disponible: US$ 1.800,00';
const SPOKEN_HINT = 'Disponible: 1.800,00 dólares';
const ERROR = 'El valor supera tu saldo disponible.';
const SPOKEN_VALUE = '1.250,00 dólares';

function fieldProps(props: Partial<TextFieldProps> = {}): TextFieldProps {
  return { label: LABEL, value: '', onChangeText: jest.fn(), ...props };
}

async function renderField(props: Partial<TextFieldProps> = {}) {
  await render(<TextField {...fieldProps(props)} />);
}

function getFieldBox() {
  const boxes = screen.container.queryAll(
    (node) => (StyleSheet.flatten(node.props.style)?.borderWidth ?? 0) > 0,
  );

  expect(boxes).toHaveLength(1);
  return boxes[0];
}

function expectBelowFieldBox(node: ReturnType<typeof getFieldBox>) {
  const nodes = screen.container.queryAll(() => true);
  const box = getFieldBox();

  expect(nodes.indexOf(box)).toBeLessThan(nodes.indexOf(node));
  expect(box.queryAll((child) => child === node)).toHaveLength(0);
}

describe('TextField ayuda', () => {
  it('muestra la ayuda bajo el campo y el error la sustituye', async () => {
    await renderField({ hint: { text: HINT } });

    const hint = screen.getByText(HINT);

    expect(hint).toHaveStyle({ ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs });
    expectBelowFieldBox(hint);

    await screen.rerender(<TextField {...fieldProps({ hint: { text: HINT }, error: ERROR })} />);

    expect(screen.getByText(ERROR)).toBeOnTheScreen();
    expect(screen.queryByText(HINT)).not.toBeOnTheScreen();

    await screen.rerender(<TextField {...fieldProps({ hint: { text: HINT } })} />);

    expect(screen.getByText(HINT)).toBeOnTheScreen();
    expect(screen.queryByText(ERROR)).not.toBeOnTheScreen();
  });

  it('la ayuda se lee con su forma hablada', async () => {
    await renderField({ hint: { text: HINT, spoken: SPOKEN_HINT } });

    const hint = screen.getByLabelText(SPOKEN_HINT);

    expect(hint).toHaveTextContent(HINT);
    expect(hint).toHaveAccessibleName(SPOKEN_HINT);
    expect(hint).toHaveProp('accessible', true);

    await screen.rerender(<TextField {...fieldProps({ hint: { text: HINT } })} />);

    expect(screen.getByText(HINT)).toHaveAccessibleName(HINT);
    expect(screen.queryByLabelText(SPOKEN_HINT)).not.toBeOnTheScreen();
  });
});

describe('TextField prefijo', () => {
  it('el prefijo es decorativo', async () => {
    await renderField({ prefix: 'US$' });

    const prefix = screen.getByText('US$');
    const nodes = screen.container.queryAll(() => true);

    expect(prefix).toHaveStyle({ ...typography.body, color: colors.textSecondary, marginRight: spacing.xs });
    expect(prefix).toHaveProp('accessible', false);
    expect(prefix).toHaveProp('importantForAccessibility', 'no');
    expect(within(getFieldBox()).getByText('US$')).toBe(prefix);
    expect(nodes.indexOf(prefix)).toBeLessThan(nodes.indexOf(screen.getByLabelText(LABEL)));
  });
});

describe('TextField valor hablado', () => {
  it('reenvía el valor hablado al campo', async () => {
    await renderField({ value: '1.250,00', accessibilityValue: { text: SPOKEN_VALUE } });

    expect(screen.getByLabelText(LABEL)).toHaveAccessibilityValue({ text: SPOKEN_VALUE });
  });
});
