import { render, screen, userEvent, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { AmountBoundField } from './AmountBoundField';
import type { AmountBoundFieldProps } from './AmountBoundField';

const LABEL = 'Desde';
const PLACEHOLDER = '0,00';
const HIDDEN = { includeHiddenElements: true };

function fieldProps(props: Partial<AmountBoundFieldProps> = {}): AmountBoundFieldProps {
  return {
    label: LABEL,
    value: '',
    onChangeText: jest.fn(),
    onClear: jest.fn(),
    currency: 'USD',
    ...props,
  };
}

function getInput(label = LABEL) {
  return screen.getByLabelText(label);
}

function getFieldBox() {
  const boxes = screen.container.queryAll(
    (node) => (StyleSheet.flatten(node.props.style)?.borderWidth ?? 0) > 0,
  );

  expect(boxes).toHaveLength(1);
  return boxes[0];
}

function indexOfNode(node: ReturnType<typeof getFieldBox>) {
  return screen.container.queryAll(() => true).indexOf(node);
}

const SPOKEN_VALUES: [Partial<AmountBoundFieldProps>, string][] = [
  [{ value: '2.000,00' }, '2.000,00 dólares'],
  [{ value: '5,00', currency: 'BRL' }, '5,00 reales'],
  [{ value: '2.000,00', currency: null }, '2.000,00'],
  [{ value: '0,00' }, '0,00 dólares'],
  [{ value: '' }, 'sin límite'],
  [{ value: '', currency: null }, 'sin límite'],
];

const CLEARABLE: [Partial<AmountBoundFieldProps>, string][] = [
  [{ value: '2.000,00' }, 'Borrar valor desde'],
  [{ value: '0,00' }, 'Borrar valor desde'],
  [{ label: 'Hasta', value: '5,00' }, 'Borrar valor hasta'],
];

async function expectSpokenValues() {
  await render(<AmountBoundField {...fieldProps()} />);

  expect(screen.getByText('US$')).toHaveProp('accessible', false);

  for (const [props, spoken] of SPOKEN_VALUES) {
    await screen.rerender(<AmountBoundField {...fieldProps(props)} />);

    expect(getInput()).toHaveAccessibilityValue({ text: spoken });
  }
}

async function expectClearButtonOnlyWithText() {
  const onClear = jest.fn();
  const user = userEvent.setup();

  await render(<AmountBoundField {...fieldProps({ onClear })} />);

  expect(screen.queryByRole('button')).not.toBeOnTheScreen();

  for (const [index, [props, name]] of CLEARABLE.entries()) {
    await screen.rerender(<AmountBoundField {...fieldProps({ ...props, onClear })} />);

    const button = within(getFieldBox()).getByRole('button', { name });

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(indexOfNode(getInput(props.label))).toBeLessThan(indexOfNode(button));

    await user.press(button);

    expect(onClear).toHaveBeenCalledTimes(index + 1);
  }

  await screen.rerender(<AmountBoundField {...fieldProps({ label: 'Hasta', onClear })} />);

  expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  expect(onClear).toHaveBeenCalledTimes(CLEARABLE.length);
}

describe('AmountBoundField', () => {
  it('lleva el símbolo de la moneda común como prefijo, placeholder 0,00 y teclado numérico, y sin moneda común no lleva símbolo', async () => {
    await render(<AmountBoundField {...fieldProps()} />);

    const prefix = within(getFieldBox()).getByText('US$', HIDDEN);

    expect(getFieldBox().children).toHaveLength(2);
    expect(indexOfNode(prefix)).toBeLessThan(indexOfNode(getInput()));
    expect(getInput().props.placeholder).toBe(PLACEHOLDER);
    expect(getInput().props.keyboardType).toBe('number-pad');

    await screen.rerender(<AmountBoundField {...fieldProps({ currency: 'BRL' })} />);

    expect(within(getFieldBox()).getByText('R$', HIDDEN)).toBeOnTheScreen();
    expect(screen.queryByText('US$', HIDDEN)).not.toBeOnTheScreen();

    await screen.rerender(<AmountBoundField {...fieldProps({ currency: null })} />);

    expect(within(getFieldBox()).queryByText(/./, HIDDEN)).not.toBeOnTheScreen();
    expect(getFieldBox().children).toHaveLength(1);
    expect(getInput().props.placeholder).toBe(PLACEHOLDER);
    expect(getInput().props.keyboardType).toBe('number-pad');
  });

  it('dice el importe hablado o sin límite', async () => {
    await expectSpokenValues();
  });

  it('Borrar valor aparece con texto, también con 0,00, y avisa con onClear', async () => {
    await expectClearButtonOnlyWithText();
  });
});
