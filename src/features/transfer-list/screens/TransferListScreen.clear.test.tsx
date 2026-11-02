import { act, fireEvent, screen, within } from 'expo-router/testing-library';
import { StyleSheet } from 'react-native';

import type { CalendarDate } from '@/utils/date';

import { focusedFieldLabels, spyOnFocusEvents, watchFocus } from '@/test/focus';
import { listRequests, rowNames, typeSearch } from '@/test/transferListHelpers';
import { applyAmountRange, applyDateRange, renderLoadedList } from '@/test/transferListSheetHelpers';
import { layout, spacing } from '@/theme';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

afterEach(jest.restoreAllMocks);

const RONALDO = 'Ronaldo de Assis Moreira';
const MESSI = 'Lionel Andres Messi';
const VALVERDE = 'Federico Valverde';
const ALL_ROWS = [RONALDO, MESSI, VALVERDE];
const SEARCH_LABEL = 'Nombre del destinatario';
const CLEAR_ALL = 'Limpiar filtros';

const day = (year: number, month: number, dayOfMonth: number): CalendarDate => ({
  year,
  month,
  day: dayOfMonth,
});

const clearAllButtons = () => screen.queryAllByRole('button', { name: CLEAR_ALL });

// Pulsa el «Limpiar filtros» que se ve y deja pasar el fotograma en que llega el foco del lector.
async function pressClearAll() {
  await fireEvent.press(screen.getByRole('button', { name: CLEAR_ALL }));
  await act(async () => {
    await jest.advanceTimersByTimeAsync(16);
  });
}

// Tras limpiar: búsqueda vacía, chips sin aplicar, todas las filas y el foco solo del lector en la búsqueda.
function expectEverythingCleared(focusEvents: () => (string | undefined)[]) {
  expect(screen.getByLabelText(SEARCH_LABEL)).toHaveDisplayValue('');
  expect(screen.getByRole('button', { name: 'Filtro de valor: sin aplicar' })).not.toBeSelected();
  expect(screen.getByRole('button', { name: 'Filtro de fecha: sin aplicar' })).not.toBeSelected();
  expect(rowNames()).toEqual(ALL_ROWS);
  expect(screen.getByText('3 transferencias')).toBeOnTheScreen();
  expect(clearAllButtons()).toHaveLength(0);
  expect(focusEvents()).toEqual([SEARCH_LABEL]);
  expect(focusedFieldLabels()).toEqual([]);
  expect(listRequests()).toHaveLength(1);
}

const ACTIVE_FILTER_CASES = [
  { filter: 'búsqueda', apply: () => typeSearch('mes'), counter: '1 de 3 transferencias' },
  { filter: 'valor', apply: () => applyAmountRange('2.000,00', '4.000,00'), counter: '2 de 3 transferencias' },
  {
    filter: 'fecha',
    apply: () => applyDateRange(day(2024, 6, 1), day(2024, 6, 30)),
    counter: '2 de 3 transferencias',
  },
];

describe('TransferListScreen: Limpiar filtros junto al contador', () => {
  it.each(ACTIVE_FILTER_CASES)(
    'Limpiar filtros aparece con algún filtro activo y filas visibles',
    async ({ apply, counter }) => {
      await renderLoadedList();

      await apply();

      const counterRow = screen.getByText(counter).parent;
      expect(rowNames().length).toBeGreaterThan(0);
      expect(counterRow && within(counterRow).queryByRole('button', { name: CLEAR_ALL })).toBeOnTheScreen();
      expect(clearAllButtons()).toHaveLength(1);
    },
  );

  it('no aparece sin filtros ni con solo espacios', async () => {
    await renderLoadedList();
    expect(clearAllButtons()).toHaveLength(0);

    await typeSearch('   ');

    const counter = screen.getByText('3 transferencias');
    expect(counter).toBeOnTheScreen();
    expect(StyleSheet.flatten(counter.parent?.props.style)?.minHeight).toBe(layout.minTouch);
    expect(screen.getByRole('button', { name: 'Borrar búsqueda' })).toBeOnTheScreen();
    expect(clearAllButtons()).toHaveLength(0);
  });
});

describe('TransferListScreen: Limpiar filtros', () => {
  it('Limpiar filtros vacía todo, vuelve a M transferencias y enfoca la búsqueda sin abrir el teclado', async () => {
    await renderLoadedList();
    await typeSearch('a');
    await applyAmountRange('2.000,00', '4.000,00');
    await applyDateRange(day(2024, 6, 1), day(2024, 6, 30));
    expect(rowNames()).toEqual([MESSI, VALVERDE]);
    watchFocus();
    const focusEvents = spyOnFocusEvents();

    await pressClearAll();

    expectEverythingCleared(focusEvents);
  });
});

// Trazos de la lupa del vacío por filtros (círculo aparte).
const SEARCH_ICON_PATHS = ['M16 16L21 21'];

// Deja la búsqueda «ronaldo» y el rango 2.000,00–4.000,00: ninguna fila coincide.
async function filterToNothing() {
  await renderLoadedList();
  await typeSearch('ronaldo');
  await applyAmountRange('2.000,00', '4.000,00');
}

describe('TransferListScreen: vacío por filtros', () => {
  it('sin coincidencias se ve 0 de M, el vacío por filtros y un solo Limpiar filtros', async () => {
    await filterToNothing();

    expect(rowNames()).toEqual([]);
    expect(screen.getByLabelText(SEARCH_LABEL)).toHaveDisplayValue('ronaldo');
    const amountChip = screen.getByRole('button', { name: 'Filtro de valor: de 2.000 a 4.000 dólares' });
    expect(amountChip).toHaveTextContent('US$ 2.000–4.000', { exact: true });
    expect(screen.getByRole('button', { name: 'Filtro de fecha: sin aplicar' })).toBeOnTheScreen();
    expect(screen.getByText('0 de 3 transferencias')).toBeOnTheScreen();
    const title = screen.getByRole('header', { name: 'Sin resultados para estos filtros' });
    const empty = title.parent ?? title;
    expect(StyleSheet.flatten(empty.parent?.props.style)?.paddingTop).toBe(spacing.xl);
    const paths = empty.queryAll((node) => typeof node.props.d === 'string').map((node) => node.props.d);
    expect(paths).toEqual(SEARCH_ICON_PATHS);
    expect(empty.queryAll((node) => node.props.r === 7)).toHaveLength(1);
    expect(within(empty).getByText('Prueba con otro nombre, valor o fecha')).toBeOnTheScreen();
    const action = within(empty).getByRole('button', { name: CLEAR_ALL });
    expect(within(action).queryByTestId('button-gradient')).not.toBeOnTheScreen();
    expect(clearAllButtons()).toHaveLength(1);
  });

  it('su Limpiar filtros hace lo mismo y enfoca la búsqueda sin teclado', async () => {
    await filterToNothing();
    watchFocus();
    const focusEvents = spyOnFocusEvents();

    await pressClearAll();

    expectEverythingCleared(focusEvents);
  });
});
