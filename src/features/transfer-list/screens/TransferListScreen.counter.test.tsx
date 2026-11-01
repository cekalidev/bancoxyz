import { screen } from 'expo-router/testing-library';
import { AccessibilityInfo, Platform } from 'react-native';

import type { CalendarDate } from '@/utils/date';

import { spyOnFocusEvents } from '@/test/homeHelpers';
import { listRequests, typeSearch } from '@/test/transferListHelpers';
import { applyAmountRange, applyDateRange, renderLoadedList } from '@/test/transferListSheetHelpers';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

afterEach(jest.restoreAllMocks);

const COUNTER_TEXT = /^\d+( de \d+)? transferencias?$/;

const day = (year: number, month: number, dayOfMonth: number): CalendarDate => ({
  year,
  month,
  day: dayOfMonth,
});

// Textos del contador anunciados a mano por el lector de pantalla, en orden.
function spyOnCounterAnnouncements() {
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockClear();
  return () => announce.mock.calls.map(([text]) => text).filter((text) => COUNTER_TEXT.test(text));
}

const expectNoReload = () => {
  expect(screen.queryByLabelText('Cargando…')).not.toBeOnTheScreen();
  expect(listRequests()).toHaveLength(1);
};

describe('TransferListScreen: anuncios del contador', () => {
  it('el contador es una región cortés y se anuncia al cambiar su texto', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await renderLoadedList();
    expect(screen.getByText('3 transferencias')).toHaveProp('accessibilityLiveRegion', 'polite');
    const announced = spyOnCounterAnnouncements();
    const focusEvents = spyOnFocusEvents();

    await typeSearch('mes');

    expect(screen.getByText('1 de 3 transferencias')).toHaveProp('accessibilityLiveRegion', 'polite');
    expect(announced()).toEqual(['1 de 3 transferencias']);

    await typeSearch('');

    expect(announced()).toEqual(['1 de 3 transferencias', '3 transferencias']);
    expect(focusEvents()).toEqual([]);
  });

  it('si el texto no cambia no se anuncia', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const announced = spyOnCounterAnnouncements();
    await renderLoadedList();

    expect(announced()).toEqual([]);

    await typeSearch('a');
    await typeSearch('A');
    await applyAmountRange('0,00', '');

    expect(screen.getByText('3 de 3 transferencias')).toBeOnTheScreen();
    expect(announced()).toEqual(['3 de 3 transferencias']);
  });
});

describe('TransferListScreen: filtrar en local', () => {
  it('filtrar no pide nada ni muestra skeleton', async () => {
    await renderLoadedList();

    await typeSearch('a');
    expectNoReload();
    await applyAmountRange('2.000,00', '4.000,00');
    expectNoReload();
    await applyDateRange(day(2024, 6, 1), day(2024, 6, 30));
    expectNoReload();
    await typeSearch('mes');

    expect(screen.getByText('1 de 3 transferencias')).toBeOnTheScreen();
    expectNoReload();
  });
});
