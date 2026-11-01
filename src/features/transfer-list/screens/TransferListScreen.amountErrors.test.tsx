import { render } from '@testing-library/react-native';
import { fireEvent, screen } from 'expo-router/testing-library';

import { AlertIcon } from '@/components/icons/AlertIcon';
import { focusedFieldLabels, watchFocus } from '@/test/focus';
import { politeRegionWith, spyOnAnnouncements, spyOnFocusEvents } from '@/test/homeHelpers';
import { applySheet, openSheet, rowNames, showSheet } from '@/test/transferListHelpers';
import {
  amountSheetTitle,
  applyAmountRange,
  BOUND_LABELS,
  boundField,
  clearBoundButton,
  fillAmountSheet,
  pressClearBound,
  renderLoadedList,
  typeShownAmount,
  type BoundLabel,
} from '@/test/transferListSheetHelpers';
import { colors } from '@/theme';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

afterEach(jest.restoreAllMocks);

const RANGE_ERROR = '«Desde» no puede ser mayor que «Hasta».';
const MESSI = 'Lionel Andres Messi';
const VALVERDE = 'Federico Valverde';
const RONALDO = 'Ronaldo de Assis Moreira';
const RANGE_CHIP_LABEL = 'Filtro de valor: de 2.000 a 4.000 dólares';

type Node = ReturnType<typeof screen.getByText>;

function pathsOf(node: Node) {
  return node.queryAll((child) => typeof child.props.d === 'string').map((child) => String(child.props.d));
}

async function alertIconPaths() {
  const { root, unmount } = await render(<AlertIcon color={colors.error} />);
  const paths = root ? pathsOf(root) : [];
  await unmount();
  return paths;
}

// Sustituye lo que muestra el campo por el importe indicado, escrito tecla a tecla.
async function replaceBound(label: BoundLabel, shown: string) {
  await fireEvent.changeText(boundField(label), '');
  await typeShownAmount(label, shown);
}

// Con 2.000,00–4.000,00 aplicado (Messi y Valverde), reabre la hoja y escribe otro rango.
async function reopenWithRange(from: string, to: string) {
  await renderLoadedList();
  await applyAmountRange('2.000,00', '4.000,00');
  await openSheet('Valor');
  await replaceBound('Desde', from);
  await replaceBound('Hasta', to);
}

const INVERTED_CASES = [
  { partition: 'Desde un centavo mayor', from: '2.000,01', to: '2.000,00' },
  { partition: 'Desde mucho mayor', from: '4.000,00', to: '2.000,00' },
];

describe('TransferListScreen: error de rango en la hoja de valor', () => {
  it.each(INVERTED_CASES)(
    'Aplicar con Desde mayor que Hasta muestra el error anunciado bajo Hasta, no aplica y enfoca Hasta',
    async ({ from, to }) => {
      const iconPaths = await alertIconPaths();
      await reopenWithRange(from, to);
      const announce = spyOnAnnouncements();
      watchFocus();

      await applySheet();

      const region = politeRegionWith(RANGE_ERROR);
      expect(region).toBeDefined();
      expect(region && pathsOf(region)).toEqual(iconPaths);
      expect(announce).toHaveBeenCalledWith(RANGE_ERROR);
      expect(amountSheetTitle()).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: RANGE_CHIP_LABEL })).toBeOnTheScreen();
      expect(rowNames()).toEqual([MESSI, VALVERDE]);
      expect(focusedFieldLabels()).toEqual(['Hasta']);
    },
  );
});

const rangeErrorShown = () => screen.queryByText(RANGE_ERROR);

describe('TransferListScreen: revalidar el rango de valor', () => {
  it('después el error se revalida en cada cambio', async () => {
    await reopenWithRange('4.000,00', '2.000,00');
    await applySheet();
    expect(rangeErrorShown()).toBeOnTheScreen();

    await replaceBound('Desde', '2.000,00');
    expect(rangeErrorShown()).not.toBeOnTheScreen();

    await replaceBound('Hasta', '1.999,99');
    expect(rangeErrorShown()).toBeOnTheScreen();

    await replaceBound('Hasta', '');
    expect(rangeErrorShown()).not.toBeOnTheScreen();
  });

  it('antes del primer Aplicar y al reabrir no hay error', async () => {
    await reopenWithRange('4.000,00', '2.000,00');
    expect(rangeErrorShown()).not.toBeOnTheScreen();

    await applySheet();
    expect(rangeErrorShown()).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar filtro de valor' }));
    expect(amountSheetTitle()).not.toBeOnTheScreen();

    await openSheet('Valor');
    await showSheet();
    expect(boundField('Desde')).toHaveDisplayValue('2.000,00');
    expect(boundField('Hasta')).toHaveDisplayValue('4.000,00');
    expect(rangeErrorShown()).not.toBeOnTheScreen();
    await replaceBound('Desde', '5.000,00');
    expect(rangeErrorShown()).not.toBeOnTheScreen();
  });
});

describe('TransferListScreen: rangos válidos del valor', () => {
  it.each([
    { partition: 'valor exacto', from: '2.000,00', to: '2.000,00', rows: [VALVERDE], label: 'de 2.000 a 2.000' },
    { partition: 'rango', from: '2.000,00', to: '4.000,00', rows: [MESSI, VALVERDE], label: 'de 2.000 a 4.000' },
    { partition: 'sin máximo', from: '4.000,00', to: '', rows: [], label: 'desde 4.000' },
    { partition: 'sin mínimo', from: '', to: '2.000,00', rows: [RONALDO, VALVERDE], label: 'hasta 2.000' },
  ])('los rangos válidos se aplican', async ({ from, to, rows, label }) => {
    await renderLoadedList();

    await applyAmountRange(from, to);

    expect(amountSheetTitle()).not.toBeOnTheScreen();
    expect(rangeErrorShown()).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: `Filtro de valor: ${label} dólares` })).toBeOnTheScreen();
    expect(rowNames()).toEqual(rows);
  });
});

const otherBound = (label: BoundLabel): BoundLabel => (label === 'Desde' ? 'Hasta' : 'Desde');
const RANGE_TEXTS: Record<BoundLabel, string> = { Desde: '2.000,00', Hasta: '4.000,00' };

describe('TransferListScreen: borrar un extremo del valor', () => {
  it('cada campo con valor tiene su botón de borrar y vacío no', async () => {
    await renderLoadedList();
    await openSheet('Valor');
    for (const label of BOUND_LABELS) expect(clearBoundButton(label)).not.toBeOnTheScreen();

    await typeShownAmount('Desde', '1,00');
    expect(clearBoundButton('Desde')).toBeOnTheScreen();
    expect(clearBoundButton('Hasta')).not.toBeOnTheScreen();

    await typeShownAmount('Hasta', '2,00');
    for (const label of BOUND_LABELS) expect(clearBoundButton(label)).toBeOnTheScreen();
  });

  it.each(BOUND_LABELS)('borrar un extremo deja el placeholder, no toca el otro y no aplica nada', async (label) => {
    await renderLoadedList();
    await applyAmountRange('2.000,00', '4.000,00');
    await openSheet('Valor');

    await pressClearBound(label);

    expect(boundField(label)).toHaveDisplayValue('');
    expect(boundField(label).props.placeholder).toBe('0,00');
    expect(clearBoundButton(label)).not.toBeOnTheScreen();
    expect(boundField(otherBound(label))).toHaveDisplayValue(RANGE_TEXTS[otherBound(label)]);
    expect(clearBoundButton(otherBound(label))).toBeOnTheScreen();
    expect(amountSheetTitle()).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: RANGE_CHIP_LABEL })).toBeOnTheScreen();
    expect(rowNames()).toEqual([MESSI, VALVERDE]);
  });
});

describe('TransferListScreen: foco al borrar un extremo del valor', () => {
  it.each(BOUND_LABELS)('borrar un extremo devuelve el foco al campo y al lector', async (label) => {
    await renderLoadedList();
    await fillAmountSheet('2.000,00', '4.000,00');
    watchFocus();
    const readerFocus = spyOnFocusEvents();

    await pressClearBound(label);

    expect(focusedFieldLabels()).toEqual([label]);
    expect(readerFocus()).toEqual([label]);
  });
});

describe('TransferListScreen: borrar con el error de rango a la vista', () => {
  it.each(BOUND_LABELS)('borrar revalida el error de rango', async (label) => {
    await reopenWithRange('4.000,00', '2.000,00');
    await applySheet();
    expect(rangeErrorShown()).toBeOnTheScreen();

    await pressClearBound(label);

    expect(rangeErrorShown()).not.toBeOnTheScreen();
    expect(amountSheetTitle()).toBeOnTheScreen();
  });
});
