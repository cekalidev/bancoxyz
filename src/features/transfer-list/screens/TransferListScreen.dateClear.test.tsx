import { screen } from 'expo-router/testing-library';

import type { CalendarDate } from '@/utils/date';

import { lastPickerRequest } from '@/test/datePickerMock';
import { focusedFieldLabels, watchFocus } from '@/test/focus';
import { spyOnFocusEvents } from '@/test/homeHelpers';
import { listRequests, openSheet, rowNames, showSheet } from '@/test/transferListHelpers';
import {
  BOUND_LABELS,
  type BoundLabel,
  chooseBound,
  clearDateButton,
  dateBoundField,
  dateSheetTitle,
  pressClearDate,
  pressDateBound,
  renderLoadedList,
} from '@/test/transferListSheetHelpers';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

afterEach(jest.restoreAllMocks);

const JUN_01: CalendarDate = { year: 2024, month: 6, day: 1 };
const JUN_30: CalendarDate = { year: 2024, month: 6, day: 30 };
const OTHER: Record<BoundLabel, BoundLabel> = { Desde: 'Hasta', Hasta: 'Desde' };
const SHOWN: Record<BoundLabel, string> = { Desde: '01/06/2024', Hasta: '30/06/2024' };

// Abre la hoja de fecha y elige Desde 01/06/2024 y Hasta 30/06/2024, sin aplicar.
async function fillJune() {
  await openSheet('Fecha');
  await showSheet();
  await chooseBound('Desde', JUN_01);
  await chooseBound('Hasta', JUN_30);
}

describe('TransferListScreen: botón de borrar de la hoja de fecha', () => {
  it.each(BOUND_LABELS)('cada campo con fecha tiene su botón de borrar y Sin límite no', async (label) => {
    await renderLoadedList();
    await openSheet('Fecha');
    await showSheet();

    await chooseBound(label, label === 'Desde' ? JUN_01 : JUN_30);

    expect(clearDateButton(label)).toBeOnTheScreen();
    expect(clearDateButton(OTHER[label])).not.toBeOnTheScreen();
  });
});

describe('TransferListScreen: borrar un extremo de la hoja de fecha', () => {
  it.each(BOUND_LABELS)(
    'borrar un extremo muestra Sin límite, no aplica y libera el límite del otro selector',
    async (label) => {
      await renderLoadedList();
      await fillJune();

      await pressClearDate(label);

      expect(dateSheetTitle()).toBeOnTheScreen();
      expect(dateBoundField(label)).toHaveTextContent('Sin límite');
      expect(clearDateButton(label)).not.toBeOnTheScreen();
      expect(dateBoundField(OTHER[label])).toHaveTextContent(SHOWN[OTHER[label]]);
      expect(screen.getByRole('button', { name: 'Filtro de fecha: sin aplicar' })).toBeOnTheScreen();
      expect(rowNames()).toHaveLength(3);
      expect(listRequests()).toHaveLength(1);
      await pressDateBound(OTHER[label]);
      const { min, max } = lastPickerRequest();
      expect({ min, max }).toEqual({ min: undefined, max: undefined });
    },
  );

  it.each(BOUND_LABELS)('borrar un extremo devuelve solo el foco del lector al campo, sin teclado', async (label) => {
    await renderLoadedList();
    await fillJune();
    watchFocus();
    const readerFocus = spyOnFocusEvents();

    await pressClearDate(label);

    expect(focusedFieldLabels()).toEqual([]);
    expect(readerFocus()).toEqual([`Fecha ${label.toLowerCase()}: sin límite`]);
  });
});
