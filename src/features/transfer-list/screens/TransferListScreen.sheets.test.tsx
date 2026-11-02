import { act, fireEvent, screen } from 'expo-router/testing-library';

import { spyOnReaderFocus } from '@/test/focus';
import { listRequests, openSheet, rowNames, sheetModal, showSheet } from '@/test/transferListHelpers';
import {
  amountSheetTitle,
  applyAmountRange,
  applyDateRange,
  boundField,
  chooseBound,
  dateBoundField,
  dateSheetTitle,
  renderLoadedList,
  typeShownAmount,
} from '@/test/transferListSheetHelpers';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

afterEach(jest.restoreAllMocks);

const MESSI = 'Lionel Andres Messi';
const VALVERDE = 'Federico Valverde';

type SheetCase = {
  sheet: 'Valor' | 'Fecha';
  chipLabel: string;
  closeLabel: string;
  title: () => ReturnType<typeof amountSheetTitle>;
  apply: () => Promise<void>;
  editDraft: () => Promise<void>;
  expectApplied: () => void;
};

const sheetCases: SheetCase[] = [
  {
    sheet: 'Valor',
    chipLabel: 'Filtro de valor: de 2.000 a 4.000 dólares',
    closeLabel: 'Cerrar filtro de valor',
    title: amountSheetTitle,
    apply: () => applyAmountRange('2.000,00', '4.000,00'),
    editDraft: async () => {
      await fireEvent.changeText(boundField('Desde'), '');
      await typeShownAmount('Desde', '1.000,00');
    },
    expectApplied: () => {
      expect(boundField('Desde')).toHaveDisplayValue('2.000,00');
      expect(boundField('Hasta')).toHaveDisplayValue('4.000,00');
    },
  },
  {
    sheet: 'Fecha',
    chipLabel: 'Filtro de fecha: del 1 de junio de 2024 al 30 de junio de 2024',
    closeLabel: 'Cerrar filtro de fecha',
    title: dateSheetTitle,
    apply: () => applyDateRange({ year: 2024, month: 6, day: 1 }, { year: 2024, month: 6, day: 30 }),
    editDraft: () => chooseBound('Desde', { year: 2024, month: 1, day: 10 }),
    expectApplied: () => {
      expect(dateBoundField('Desde')).toHaveTextContent('01/06/2024');
      expect(dateBoundField('Hasta')).toHaveTextContent('30/06/2024');
    },
  },
];

type CloseWay = { way: string; close: (sheet: SheetCase) => Promise<void> };

// El fondo de la hoja: lo único pulsable dentro del Modal que no es un botón.
function backdropOf() {
  const [backdrop] = sheetModal().queryAll(
    (node) => typeof node.props.onClick === 'function' && node.props.accessibilityRole !== 'button',
  );
  return backdrop;
}

const closeWays: CloseWay[] = [
  { way: '✕', close: ({ closeLabel }) => fireEvent.press(screen.getByRole('button', { name: closeLabel })) },
  { way: 'fondo', close: () => fireEvent.press(backdropOf()) },
  { way: 'atrás', close: () => fireEvent(sheetModal(), 'requestClose') },
];

const cases = sheetCases.flatMap((sheet) => closeWays.map((way) => ({ ...sheet, ...way })));

// Aplica el filtro de la hoja, la reabre y deja un cambio sin aplicar.
async function openWithUnappliedChange(sheet: SheetCase) {
  await renderLoadedList();
  await sheet.apply();
  expect(rowNames()).toEqual([MESSI, VALVERDE]);
  await openSheet(sheet.sheet);
  await showSheet();
  await sheet.editDraft();
}

describe('TransferListScreen: cerrar una hoja sin aplicar', () => {
  it.each(cases)(
    'cerrar la hoja descarta lo escrito, no cambia el filtro y devuelve el foco al chip',
    async (sheetCase) => {
      await openWithUnappliedChange(sheetCase);
      const readerFocus = spyOnReaderFocus();

      await sheetCase.close(sheetCase);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(16);
      });

      expect(sheetCase.title()).not.toBeOnTheScreen();
      expect(readerFocus()).toEqual([sheetCase.chipLabel]);
      expect(screen.getByRole('button', { name: sheetCase.chipLabel })).toBeOnTheScreen();
      expect(rowNames()).toEqual([MESSI, VALVERDE]);
      expect(screen.getByText('2 de 3 transferencias')).toBeOnTheScreen();
    },
  );

});

describe('TransferListScreen: atrás con una hoja abierta', () => {
  it('atrás con la hoja abierta no sale del listado', async () => {
    await renderLoadedList();
    await openSheet('Valor');
    await showSheet();

    await fireEvent(sheetModal(), 'requestClose');

    expect(amountSheetTitle()).not.toBeOnTheScreen();
    expect(screen).toHavePathname('/transferencias');
    expect(screen.getByText('3 transferencias')).toBeOnTheScreen();
    expect(listRequests()).toHaveLength(1);
  });

});

describe('TransferListScreen: reabrir una hoja', () => {
  it.each(sheetCases)('al reabrirla trae el filtro aplicado', async (sheetCase) => {
    await openWithUnappliedChange(sheetCase);
    await fireEvent.press(screen.getByRole('button', { name: sheetCase.closeLabel }));

    await openSheet(sheetCase.sheet);
    await showSheet();

    expect(sheetCase.title()).toBeOnTheScreen();
    sheetCase.expectApplied();
  });
});
