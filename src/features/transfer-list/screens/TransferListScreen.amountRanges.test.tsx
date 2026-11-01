import { fireEvent, screen, within } from 'expo-router/testing-library';

import { transferItem, transferListOf } from '@/test/apiFixtures';
import { reply } from '@/test/fetchMock';
import { applySheet, openSheet, rowNames, rowOf } from '@/test/transferListHelpers';
import {
  amountSheetTitle,
  applyAmountRange,
  BOUND_LABELS,
  boundField,
  clearBoundButton,
  prefixOf,
  renderLoadedList,
  typeShownAmount,
} from '@/test/transferListSheetHelpers';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

afterEach(jest.restoreAllMocks);

// Cuatro transferencias en USD, de la más reciente a la más antigua, una por importe de la tabla.
const BELOW = 'Ana Belén Torres';
const AT = 'Bruno Castillo';
const ABOVE = 'Carla Domínguez';
const TOP = 'Diego Esteban';

const EDGE_LIST = reply(
  200,
  transferListOf([
    transferItem({ name: BELOW, value: 999.99, date: '2024-08-04' }),
    transferItem({ name: AT, value: 1000, date: '2024-08-03' }),
    transferItem({ name: ABOVE, value: 1000.01, date: '2024-08-02' }),
    transferItem({ name: TOP, value: 3500, date: '2024-08-01' }),
  ]),
);

const RANGE_CASES = [
  { partition: 'solo mínimo, en el límite', from: '1.000,00', to: '', rows: [AT, ABOVE, TOP] },
  { partition: 'solo mínimo, límite + 0,01', from: '1.000,01', to: '', rows: [ABOVE, TOP] },
  { partition: 'solo máximo, en el límite', from: '', to: '1.000,00', rows: [BELOW, AT] },
  { partition: 'solo máximo, límite − 0,01', from: '', to: '999,99', rows: [BELOW] },
  { partition: 'valor exacto', from: '1.000,00', to: '1.000,00', rows: [AT] },
  { partition: 'rango intermedio', from: '1.000,01', to: '3.499,99', rows: [ABOVE] },
  { partition: 'por encima de todo', from: '3.500,01', to: '', rows: [] },
  { partition: 'por debajo de todo', from: '', to: '999,98', rows: [] },
  { partition: 'máximo de entrada', from: '9.999.999.999,99', to: '', rows: [] },
];

// Encabezados del vacío por filtros a la vista: uno si ninguna fila coincide.
const noResultsTitles = () => screen.queryAllByRole('header', { name: 'Sin resultados para estos filtros' });

describe('TransferListScreen: rangos del filtro de valor', () => {
  it.each(RANGE_CASES)('cada rango aplicado deja exactamente sus filas', async ({ from, to, rows }) => {
    await renderLoadedList(EDGE_LIST, 4);

    await applyAmountRange(from, to);

    expect(rowNames()).toEqual(rows);
    expect(screen.getByText(`${rows.length} de 4 transferencias`)).toBeOnTheScreen();
    expect(noResultsTitles()).toHaveLength(rows.length === 0 ? 1 : 0);
  });
});

const PAYEE = 'Elena Fuentes';

// Importes con más de dos decimales: entran según el importe redondeado que se ve en la fila.
const ROUNDING_CASES = [
  { received: 999.994, shown: 'US$ 999,99', fromMatches: false, toMatches: true },
  { received: 999.995, shown: 'US$ 1.000,00', fromMatches: true, toMatches: false },
  { received: 1000.004, shown: 'US$ 1.000,00', fromMatches: true, toMatches: false },
];

describe('TransferListScreen: importes con más de dos decimales', () => {
  it.each(ROUNDING_CASES)(
    'un importe con más de dos decimales entra o no según lo que se ve',
    async ({ received, shown, fromMatches, toMatches }) => {
      await renderLoadedList(reply(200, transferListOf([transferItem({ name: PAYEE, value: received })])), 1);
      expect(within(rowOf(PAYEE)).getByText(shown)).toBeOnTheScreen();

      await applyAmountRange('1.000,00', '');
      expect(rowNames()).toEqual(fromMatches ? [PAYEE] : []);

      await openSheet('Valor');
      await fireEvent.changeText(boundField('Desde'), '');
      await typeShownAmount('Hasta', '999,99');
      await applySheet();
      expect(rowNames()).toEqual(toMatches ? [PAYEE] : []);
    },
  );
});

const ALL_ROWS = ['Ronaldo de Assis Moreira', 'Lionel Andres Messi', 'Federico Valverde'];
const RANGE_ERROR = '«Desde» no puede ser mayor que «Hasta».';
const amountChip = () => screen.getByRole('button', { name: /^Filtro de valor:/ });

// 0,00 es un límite: con las tres transferencias reales solo Hasta 0,00 deja la lista sin filas.
// Con filas, «Limpiar filtros» va junto al contador; sin filas, solo en el vacío por filtros.
const ZERO_CASES = [
  { partition: 'Desde 0,00', from: '0,00', to: '', rows: ALL_ROWS, chip: 'Desde US$\u00a00', noResults: false },
  { partition: 'Hasta 0,00', from: '', to: '0,00', rows: [], chip: 'Hasta US$\u00a00', noResults: true },
  { partition: 'los dos en 0,00', from: '0,00', to: '0,00', rows: [], chip: 'US$\u00a00–0', noResults: true },
  { partition: 'Desde 0,01 y Hasta 0,00', from: '0,01', to: '0,00', rows: null, chip: 'Valor', noResults: false },
];

// El único «Limpiar filtros» va junto al contador o, sin filas, en el vacío por filtros.
function expectClearAllPlace(counter: string, noResults: boolean) {
  const clearAll = { name: 'Limpiar filtros' };
  expect(screen.getAllByRole('button', clearAll)).toHaveLength(1);
  const counterRow = screen.getByText(counter).parent;
  expect(counterRow && within(counterRow).queryAllByRole('button', clearAll)).toHaveLength(noResults ? 0 : 1);
  expect(noResultsTitles()).toHaveLength(noResults ? 1 : 0);
}

describe('TransferListScreen: cero en el filtro de valor', () => {
  it.each(ZERO_CASES)('0,00 se aplica tal cual con su chip, contador y vacío', async (zeroCase) => {
    const { from, to, rows, chip, noResults } = zeroCase;
    await renderLoadedList();

    await applyAmountRange(from, to);

    expect(amountChip()).toHaveTextContent(chip);
    if (rows === null) {
      expect(amountSheetTitle()).toBeOnTheScreen();
      expect(screen.getByText(RANGE_ERROR)).toBeOnTheScreen();
      expect(rowNames()).toEqual(ALL_ROWS);
      return;
    }
    expect(amountSheetTitle()).not.toBeOnTheScreen();
    expect(rowNames()).toEqual(rows);
    expect(screen.getByText(`${rows.length} de 3 transferencias`)).toBeOnTheScreen();
    expectClearAllPlace(`${rows.length} de 3 transferencias`, noResults);
  });

  it('el campo con 0,00 muestra su botón de borrar y vuelve con 0,00 al reabrir', async () => {
    await renderLoadedList();
    await openSheet('Valor');

    for (const label of BOUND_LABELS) {
      await typeShownAmount(label, '0');
      expect(boundField(label)).toHaveDisplayValue('0,00');
      expect(clearBoundButton(label)).toBeOnTheScreen();
    }
    await applySheet();
    await openSheet('Valor');

    for (const label of BOUND_LABELS) {
      expect(boundField(label)).toHaveDisplayValue('0,00');
      expect(clearBoundButton(label)).toBeOnTheScreen();
    }
  });
});

const [RONALDO, MESSI, VALVERDE] = ALL_ROWS;

// Varias monedas: se compara el número sin convertir y cada fila conserva su moneda.
const MIXED_LIST = reply(
  200,
  transferListOf([
    transferItem({ name: RONALDO, value: 1000, currency: 'USD', date: '2024-08-25' }),
    transferItem({ name: MESSI, value: 1000, currency: 'BRL', date: '2024-07-10' }),
    transferItem({ name: VALVERDE, value: 500, currency: 'BRL', date: '2024-06-12' }),
  ]),
);

const MIXED_CASES = [
  {
    from: '1.000,00',
    to: '',
    rows: [
      [RONALDO, 'US$ 1.000,00'],
      [MESSI, 'R$ 1.000,00'],
    ],
    chip: 'Desde 1.000',
    label: 'Filtro de valor: desde 1.000',
  },
  { from: '2.000,00', to: '4.000,00', rows: [], chip: '2.000–4.000', label: 'Filtro de valor: de 2.000 a 4.000' },
  {
    from: '',
    to: '500,50',
    rows: [[VALVERDE, 'R$ 500,00']],
    chip: 'Hasta 500,50',
    label: 'Filtro de valor: hasta 500,50',
  },
];

describe('TransferListScreen: filtro de valor con varias monedas', () => {
  it.each(MIXED_CASES)(
    'con varias monedas los campos no llevan símbolo y cada fila conserva su moneda',
    async ({ from, to, rows, chip, label }) => {
      await renderLoadedList(MIXED_LIST);
      await openSheet('Valor');
      for (const bound of BOUND_LABELS) expect(prefixOf(bound)).toEqual([]);
      await applySheet();

      await applyAmountRange(from, to);

      expect(rowNames()).toEqual(rows.map(([name]) => name));
      for (const [name, amount] of rows) expect(within(rowOf(name)).getByText(amount)).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: label })).toHaveTextContent(chip, { exact: true });
    },
  );
});
