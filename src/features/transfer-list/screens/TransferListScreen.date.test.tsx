import { act, fireEvent, screen } from 'expo-router/testing-library';

import type { CalendarDate } from '@/utils/date';

import {
  applySheet,
  listRequests,
  openSheet,
  rowNames,
  showSheet,
  spyOnReaderFocus,
} from '@/test/transferListHelpers';
import { dismissPicker, lastPickerRequest } from '@/test/datePickerMock';
import { DATE_RANGE_CASES } from '@/test/dateRangeCases';
import {
  applyDateRange,
  BOUND_LABELS,
  type BoundLabel,
  chooseBound,
  clearDateButton,
  pressClearDate,
  DATE_SHEET_TITLE,
  dateBoundField,
  dateSheetTitle,
  pressDateBound,
  renderLoadedList,
} from '@/test/transferListSheetHelpers';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

afterEach(jest.restoreAllMocks);

const day = (year: number, month: number, dayOfMonth: number): CalendarDate => ({
  year,
  month,
  day: dayOfMonth,
});

// Con hoy = 31/10/2026: el otro campo se elige antes de pulsar el campo que se mira.
const PICKER_REQUEST_CASES: {
  case: string;
  preset: [BoundLabel, CalendarDate];
  pressed: BoundLabel;
  expected: { value: CalendarDate; min?: CalendarDate; max?: CalendarDate };
}[] = [
  {
    case: 'Desde vacío con Hasta antes de hoy abre en Hasta',
    preset: ['Hasta', day(2024, 6, 30)],
    pressed: 'Desde',
    expected: { value: day(2024, 6, 30), max: day(2024, 6, 30) },
  },
  {
    case: 'Hasta vacío con Desde después de hoy abre en Desde',
    preset: ['Desde', day(2026, 12, 1)],
    pressed: 'Hasta',
    expected: { value: day(2026, 12, 1), min: day(2026, 12, 1) },
  },
  {
    case: 'Desde vacío con Hasta después de hoy abre en hoy',
    preset: ['Hasta', day(2026, 11, 15)],
    pressed: 'Desde',
    expected: { value: day(2026, 10, 31), max: day(2026, 11, 15) },
  },
  {
    case: 'Desde con fecha abre en la suya',
    preset: ['Desde', day(2024, 6, 1)],
    pressed: 'Desde',
    expected: { value: day(2024, 6, 1) },
  },
];

const JUNE_CHIP_LABEL = 'Filtro de fecha: del 1 de junio de 2024 al 30 de junio de 2024';
const UNFILTERED_CHIP_LABEL = 'Filtro de fecha: sin aplicar';
const ALL_ROWS = ['Ronaldo de Assis Moreira', 'Lionel Andres Messi', 'Federico Valverde'];

// Aplica el rango de junio de 2024 y vuelve a abrir la hoja.
async function reopenWithJune() {
  await applyDateRange(day(2024, 6, 1), day(2024, 6, 30));
  await openSheet('Fecha');
  await showSheet();
}

// Comprueba que la hoja se cerró sin filtro de fecha: chip «Fecha» con el foco y las 3 filas.
function expectDatesRemoved(readerFocus: ReturnType<typeof spyOnReaderFocus>) {
  expect(dateSheetTitle()).not.toBeOnTheScreen();
  expect(screen.getByRole('button', { name: UNFILTERED_CHIP_LABEL })).toHaveTextContent('Fecha');
  expect(readerFocus().at(-1)).toBe(UNFILTERED_CHIP_LABEL);
  expect(rowNames()).toEqual(ALL_ROWS);
  expect(screen.getByText('3 transferencias')).toBeOnTheScreen();
}

describe('TransferListScreen: abrir la hoja de fecha', () => {
  it('el chip Fecha abre la hoja con su título como encabezado y con el foco, Sin límite y sin Quitar filtro', async () => {
    const readerFocus = spyOnReaderFocus();
    await renderLoadedList();

    await openSheet('Fecha');
    expect(dateSheetTitle()).toBeOnTheScreen();
    await showSheet();

    expect(readerFocus()).toEqual([DATE_SHEET_TITLE]);
    expect(screen.getByRole('button', { name: 'Cerrar filtro de fecha' })).toBeOnTheScreen();
    for (const label of BOUND_LABELS) {
      expect(dateBoundField(label)).toHaveAccessibleName(`Fecha ${label.toLowerCase()}: sin límite`);
      expect(dateBoundField(label)).toHaveTextContent('Sin límite');
      expect(clearDateButton(label)).not.toBeOnTheScreen();
    }
    expect(screen.getByRole('button', { name: 'Aplicar' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Quitar filtro' })).not.toBeOnTheScreen();
  });
});

describe('TransferListScreen: selector de la hoja de fecha', () => {
  it.each(PICKER_REQUEST_CASES)(
    'pulsar un campo abre el selector con su fecha y sus límites',
    async ({ preset: [presetLabel, presetDate], pressed, expected }) => {
      await renderLoadedList();
      await openSheet('Fecha');
      await chooseBound(presetLabel, presetDate);

      await pressDateBound(pressed);

      const { value, min, max } = lastPickerRequest();
      expect({ value, min, max }).toEqual(expected);
    },
  );
});

describe('TransferListScreen: aceptar o cancelar el selector de la hoja de fecha', () => {
  it('Aceptar pone la fecha y Cancelar no cambia nada, la hoja sigue abierta y el foco vuelve al campo', async () => {
    const readerFocus = spyOnReaderFocus();
    await renderLoadedList();
    await openSheet('Fecha');

    await chooseBound('Desde', day(2024, 6, 1));

    expect(dateSheetTitle()).toBeOnTheScreen();
    expect(dateBoundField('Desde')).toHaveTextContent('01/06/2024');
    expect(readerFocus().at(-1)).toBe('Fecha desde: 1 de junio de 2024');

    await pressDateBound('Hasta');
    await dismissPicker();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(16);
    });

    expect(dateSheetTitle()).toBeOnTheScreen();
    expect(dateBoundField('Desde')).toHaveTextContent('01/06/2024');
    expect(dateBoundField('Hasta')).toHaveTextContent('Sin límite');
    expect(readerFocus().at(-1)).toBe('Fecha hasta: sin límite');
  });
});

describe('TransferListScreen: aplicar el filtro de fecha', () => {
  it('Aplicar cierra la hoja, devuelve el foco al chip y actualiza filas, contador y chip sin peticiones', async () => {
    const readerFocus = spyOnReaderFocus();
    const chipLabel = 'Filtro de fecha: del 1 de junio de 2024 al 30 de junio de 2024';
    await renderLoadedList();
    await openSheet('Fecha');
    await chooseBound('Desde', day(2024, 6, 1));
    await chooseBound('Hasta', day(2024, 6, 30));

    await applySheet();

    expect(dateSheetTitle()).not.toBeOnTheScreen();
    expect(readerFocus().at(-1)).toBe(chipLabel);
    expect(rowNames()).toEqual(['Lionel Andres Messi', 'Federico Valverde']);
    expect(screen.getByText('2 de 3 transferencias')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: chipLabel })).toHaveTextContent('01/06/2024–30/06/2024');
    expect(screen.queryByLabelText('Cargando…')).not.toBeOnTheScreen();
    expect(listRequests()).toHaveLength(1);
  });
});

describe('TransferListScreen: rangos del filtro de fecha', () => {
  it.each(DATE_RANGE_CASES)('cada rango de fechas aplicado deja exactamente sus filas', async ({ from, to, rows }) => {
    await renderLoadedList();

    await applyDateRange(from, to);

    expect(rowNames()).toEqual(rows);
    expect(screen.getByText(`${rows.length} de 3 transferencias`)).toBeOnTheScreen();
  });
});

describe('TransferListScreen: quitar el filtro de fecha', () => {
  it('Aplicar con los dos Sin límite quita el filtro', async () => {
    const readerFocus = spyOnReaderFocus();
    await renderLoadedList();

    await applyDateRange(null, null);
    expectDatesRemoved(readerFocus);

    await reopenWithJune();
    for (const label of BOUND_LABELS) await pressClearDate(label);
    await applySheet();

    expectDatesRemoved(readerFocus);
    expect(listRequests()).toHaveLength(1);
  });

  it('Quitar filtro vacía los dos extremos y cierra', async () => {
    const readerFocus = spyOnReaderFocus();
    await renderLoadedList();
    await reopenWithJune();

    await fireEvent.press(screen.getByRole('button', { name: 'Quitar filtro' }));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(16);
    });

    expectDatesRemoved(readerFocus);
    await openSheet('Fecha');
    for (const label of BOUND_LABELS) expect(dateBoundField(label)).toHaveTextContent('Sin límite');
    expect(screen.queryByRole('button', { name: 'Quitar filtro' })).not.toBeOnTheScreen();
  });
});

describe('TransferListScreen: reabrir la hoja de fecha', () => {
  it('con el filtro aplicado trae sus fechas y Quitar filtro', async () => {
    await renderLoadedList();

    await reopenWithJune();

    expect(dateSheetTitle()).toBeOnTheScreen();
    expect(dateBoundField('Desde')).toHaveTextContent('01/06/2024');
    expect(dateBoundField('Hasta')).toHaveTextContent('30/06/2024');
    expect(screen.getByRole('button', { name: 'Quitar filtro' })).toBeOnTheScreen();
  });

  it('abrir la hoja no pide nada', async () => {
    await renderLoadedList();
    expect(listRequests()).toHaveLength(1);

    await openSheet('Fecha');
    expect(dateSheetTitle()).toBeOnTheScreen();
    await showSheet();
    expect(listRequests()).toHaveLength(1);

    await applySheet();
    await reopenWithJune();
    expect(screen.getByRole('button', { name: JUNE_CHIP_LABEL })).toBeOnTheScreen();
    expect(listRequests()).toHaveLength(1);
  });
});
