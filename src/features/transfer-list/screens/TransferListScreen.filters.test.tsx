import { act, fireEvent, screen, within } from 'expo-router/testing-library';

import type { CalendarDate } from '@/utils/date';

import { applySheet, openSheet, rowNames, typeSearch } from '@/test/transferListHelpers';
import {
  applyAmountRange,
  applyDateRange,
  boundField,
  renderLoadedList,
  typeShownAmount,
} from '@/test/transferListSheetHelpers';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

afterEach(jest.restoreAllMocks);

const RONALDO = 'Ronaldo de Assis Moreira';
const MESSI = 'Lionel Andres Messi';
const VALVERDE = 'Federico Valverde';
const ALL_ROWS = [RONALDO, MESSI, VALVERDE];

const day = (year: number, month: number, dayOfMonth: number): CalendarDate => ({
  year,
  month,
  day: dayOfMonth,
});

type Range<T> = [T | null, T | null] | null;
type CombinationCase = { query: string; amount: Range<string>; dates: Range<CalendarDate>; rows: string[] };

const VALUE_RANGE: Range<string> = ['2.000,00', '4.000,00'];
const JUNE: Range<CalendarDate> = [day(2024, 6, 1), day(2024, 6, 30)];

// Tabla de decisión con las tres transferencias reales: los tres filtros se combinan con Y.
const COMBINATION_CASES: CombinationCase[] = [
  { query: 'a', amount: null, dates: null, rows: ALL_ROWS },
  { query: 'a', amount: VALUE_RANGE, dates: null, rows: [MESSI, VALVERDE] },
  { query: 'a', amount: VALUE_RANGE, dates: JUNE, rows: [MESSI, VALVERDE] },
  { query: 'mes', amount: VALUE_RANGE, dates: JUNE, rows: [MESSI] },
  { query: 'ronaldo', amount: VALUE_RANGE, dates: null, rows: [] },
  { query: '', amount: null, dates: [day(2024, 8, 25), day(2024, 8, 25)], rows: [RONALDO] },
  { query: '', amount: ['3.000,00', null], dates: [day(2024, 6, 13), null], rows: [] },
];

describe('TransferListScreen: combinación de filtros', () => {
  it.each(COMBINATION_CASES)('cada combinación deja exactamente sus filas', async ({ query, amount, dates, rows }) => {
    await renderLoadedList();

    if (query) await typeSearch(query);
    if (amount) await applyAmountRange(amount[0] ?? '', amount[1] ?? '');
    if (dates) await applyDateRange(dates[0], dates[1]);

    expect(rowNames()).toEqual(rows);
    expect(screen.getByText(`${rows.length} de 3 transferencias`)).toBeOnTheScreen();
  });
});

const AMOUNT_UNSET = 'Filtro de valor: sin aplicar';
const DATE_UNSET = 'Filtro de fecha: sin aplicar';
const JUNE_LABEL = 'Filtro de fecha: del 1 de junio de 2024 al 30 de junio de 2024';

type ShownFilters = { query: string; amountLabel: string; dateLabel: string; rows: string[] };

// Lo que se ve de los tres filtros y las filas que dejan.
function expectFilters({ query, amountLabel, dateLabel, rows }: ShownFilters) {
  expect(screen.getByLabelText('Nombre del destinatario')).toHaveDisplayValue(query);
  expect(screen.getByRole('button', { name: amountLabel })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: dateLabel })).toBeOnTheScreen();
  expect(rowNames()).toEqual(rows);
}

// Abre la hoja del chip y pulsa «Quitar filtro».
async function removeFilter(chip: 'Valor' | 'Fecha') {
  await openSheet(chip);
  await fireEvent.press(screen.getByRole('button', { name: 'Quitar filtro' }));
  await act(async () => {
    await jest.advanceTimersByTimeAsync(16);
  });
}

describe('TransferListScreen: cada filtro conserva los otros', () => {
  it('aplicar, cambiar o quitar un filtro no borra los otros dos', async () => {
    await renderLoadedList();
    await typeSearch('a');
    await applyAmountRange('2.000,00', '4.000,00');
    const rangeLabel = 'Filtro de valor: de 2.000 a 4.000 dólares';
    expectFilters({ query: 'a', amountLabel: rangeLabel, dateLabel: DATE_UNSET, rows: [MESSI, VALVERDE] });

    await applyDateRange(day(2024, 6, 1), day(2024, 6, 30));
    expectFilters({ query: 'a', amountLabel: rangeLabel, dateLabel: JUNE_LABEL, rows: [MESSI, VALVERDE] });

    await openSheet('Valor');
    await fireEvent.changeText(boundField('Desde'), '');
    await typeShownAmount('Desde', '3.000,00');
    await applySheet();
    const changedLabel = 'Filtro de valor: de 3.000 a 4.000 dólares';
    expectFilters({ query: 'a', amountLabel: changedLabel, dateLabel: JUNE_LABEL, rows: [MESSI] });

    await typeSearch('e');
    expectFilters({ query: 'e', amountLabel: changedLabel, dateLabel: JUNE_LABEL, rows: [MESSI] });

    await removeFilter('Valor');
    expectFilters({ query: 'e', amountLabel: AMOUNT_UNSET, dateLabel: JUNE_LABEL, rows: [MESSI, VALVERDE] });

    await removeFilter('Fecha');
    expectFilters({ query: 'e', amountLabel: AMOUNT_UNSET, dateLabel: DATE_UNSET, rows: ALL_ROWS });
    expect(screen.getByText('3 de 3 transferencias')).toBeOnTheScreen();
  });
});

// Contenedores que se desplazan en horizontal.
const horizontalScrolls = () => screen.container.queryAll((node) => node.props.horizontal === true);

const CHIP_CASES = [
  {
    filter: 'valor',
    apply: () => applyAmountRange('2.000,00', '4.000,00'),
    text: 'US$\u00a02.000–4.000',
    label: 'Filtro de valor: de 2.000 a 4.000 dólares',
    other: DATE_UNSET,
  },
  {
    filter: 'fecha',
    apply: () => applyDateRange(day(2024, 6, 1), day(2024, 6, 30)),
    text: '01/06/2024–30/06/2024',
    label: JUNE_LABEL,
    other: AMOUNT_UNSET,
  },
];

describe('TransferListScreen: chips de filtro', () => {
  it.each(CHIP_CASES)(
    'los chips muestran el resumen y la etiqueta de cada filtro aplicado',
    async ({ apply, text, label, other }) => {
      await renderLoadedList();

      await apply();

      const chip = screen.getByRole('button', { name: label });
      expect(chip).toHaveTextContent(text, { exact: true });
      expect(chip).toBeSelected();
      expect(screen.getByRole('button', { name: other })).not.toBeSelected();
    },
  );

  it('los chips están en una fila con desplazamiento horizontal', async () => {
    await renderLoadedList();
    await applyAmountRange('2.000,50', '4.000,05');
    await applyDateRange(day(2024, 6, 1), day(2024, 6, 30));

    const scrolls = horizontalScrolls();
    expect(scrolls).toHaveLength(1);
    const row = within(scrolls[0]);
    expect(row.getByRole('button', { name: 'Filtro de valor: de 2.000,50 a 4.000,05 dólares' })).toBeOnTheScreen();
    expect(row.getByRole('button', { name: JUNE_LABEL })).toBeOnTheScreen();
    expect(row.getAllByRole('button')).toHaveLength(2);
  });
});
