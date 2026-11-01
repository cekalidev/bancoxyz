/** @jest-environment-options {"timezone":"Asia/Tokyo"} */
import { screen } from 'expo-router/testing-library';

import { DATE_RANGE_CASES } from '@/test/dateRangeCases';
import { rowNames } from '@/test/transferListHelpers';
import { applyDateRange, renderLoadedList } from '@/test/transferListSheetHelpers';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

afterEach(jest.restoreAllMocks);

// UTC+9: el filtro compara días de calendario, sin pasar por la hora del dispositivo.
describe('TransferListScreen: filtro de fecha en una zona adelantada a UTC', () => {
  it('se ejecuta con la zona horaria de Tokio', () => {
    expect(new Date(2024, 5, 12).getTimezoneOffset()).toBe(-540);
  });

  it.each(DATE_RANGE_CASES)('en esta zona cada rango de fechas deja las mismas filas', async ({ from, to, rows }) => {
    await renderLoadedList();

    await applyDateRange(from, to);

    expect(rowNames()).toEqual(rows);
    expect(screen.getByText(`${rows.length} de 3 transferencias`)).toBeOnTheScreen();
  });
});
