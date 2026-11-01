import { createRef } from 'react';
import { render, screen, userEvent, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { PressableInstance } from 'react-native';

import { layout, spacing } from '@/theme';

import type { AmountBounds, DateBounds } from '../types';
import { FilterChips } from './FilterChips';

const DASH = '–';
const NO_AMOUNT: AmountBounds = { min: null, max: null };
const NO_DATES: DateBounds = { from: null, to: null };

type ChipExpectation = { text: string; label: string; selected: boolean };

type Case = {
  amount: AmountBounds;
  dates: DateBounds;
  currency: string | null;
  amountChip: ChipExpectation;
  dateChip: ChipExpectation;
};

const IDLE_AMOUNT: ChipExpectation = { text: 'Valor', label: 'Filtro de valor: sin aplicar', selected: false };
const IDLE_DATE: ChipExpectation = { text: 'Fecha', label: 'Filtro de fecha: sin aplicar', selected: false };

const CASES: Case[] = [
  { amount: NO_AMOUNT, dates: NO_DATES, currency: 'USD', amountChip: IDLE_AMOUNT, dateChip: IDLE_DATE },
  {
    amount: { min: 200000, max: 400000 },
    dates: { from: { year: 2024, month: 6, day: 1 }, to: { year: 2024, month: 6, day: 30 } },
    currency: 'USD',
    amountChip: {
      text: `US$ 2.000${DASH}4.000`,
      label: 'Filtro de valor: de 2.000 a 4.000 dólares',
      selected: true,
    },
    dateChip: {
      text: `01/06/2024${DASH}30/06/2024`,
      label: 'Filtro de fecha: del 1 de junio de 2024 al 30 de junio de 2024',
      selected: true,
    },
  },
  {
    amount: { min: 200000, max: null },
    dates: NO_DATES,
    currency: null,
    amountChip: { text: 'Desde 2.000', label: 'Filtro de valor: desde 2.000', selected: true },
    dateChip: IDLE_DATE,
  },
  {
    amount: NO_AMOUNT,
    dates: { from: null, to: { year: 2024, month: 6, day: 30 } },
    currency: 'USD',
    amountChip: IDLE_AMOUNT,
    dateChip: {
      text: 'Hasta 30/06/2024',
      label: 'Filtro de fecha: hasta el 30 de junio de 2024',
      selected: true,
    },
  },
];

type Node = ReturnType<typeof chipsRow>;

function chipsRow() {
  const scrolls = screen.container.queryAll((node) => node.type === 'RCTScrollView');

  expect(scrolls).toHaveLength(1);

  return scrolls[0];
}

// Etiqueta accesible de la instancia nativa que recibió la ref.
function labelOf(instance: unknown): unknown {
  if (typeof instance !== 'object' || instance === null || !('props' in instance)) return undefined;

  const { props } = instance;

  return typeof props === 'object' && props !== null && 'accessibilityLabel' in props
    ? props.accessibilityLabel
    : undefined;
}

async function renderChips({ amount, dates, currency }: Case) {
  const handlers = { onOpenAmount: jest.fn(), onOpenDates: jest.fn() };
  const refs = {
    amountChipRef: createRef<PressableInstance>(),
    dateChipRef: createRef<PressableInstance>(),
  };

  await render(<FilterChips amount={amount} dates={dates} currency={currency} {...handlers} {...refs} />);

  return { ...handlers, ...refs };
}

// La fila desliza en horizontal, sin indicador y sin repartirse el alto sobrante.
function scrollingChips() {
  const row = chipsRow();

  expect(row).toHaveProp('horizontal', true);
  expect(row).toHaveProp('showsHorizontalScrollIndicator', false);
  expect(row).toHaveStyle({ flexGrow: 0 });
  expect(row).toHaveProp('keyboardShouldPersistTaps', 'handled');
  expect(StyleSheet.flatten(row.props.contentContainerStyle)).toEqual(
    expect.objectContaining({
      gap: spacing.xs,
      paddingVertical: spacing.xxs,
      paddingHorizontal: layout.screenPadding,
    }),
  );

  return within(row).getAllByRole('button');
}

function expectChip(chip: Node, { text, label, selected }: ChipExpectation) {
  expect(chip).toHaveAccessibleName(label);
  expect(within(chip).getByText(text)).toBeOnTheScreen();
  expect(chip.props.accessibilityState).toEqual(expect.objectContaining({ selected }));
}

it.each(CASES)(
  'muestra Valor y Fecha en una fila con desplazamiento horizontal, cada chip con su texto, su etiqueta y su estado',
  async (testCase) => {
    const { onOpenAmount, onOpenDates, amountChipRef, dateChipRef } = await renderChips(testCase);
    const user = userEvent.setup();
    const chips = scrollingChips();

    expect(chips).toHaveLength(2);
    expectChip(chips[0], testCase.amountChip);
    expectChip(chips[1], testCase.dateChip);
    expect(labelOf(amountChipRef.current)).toBe(testCase.amountChip.label);
    expect(labelOf(dateChipRef.current)).toBe(testCase.dateChip.label);

    await user.press(chips[0]);

    expect(onOpenAmount).toHaveBeenCalledTimes(1);
    expect(onOpenDates).not.toHaveBeenCalled();

    await user.press(chips[1]);

    expect(onOpenAmount).toHaveBeenCalledTimes(1);
    expect(onOpenDates).toHaveBeenCalledTimes(1);
  },
);
