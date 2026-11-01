import { router } from 'expo-router';
import { act, fireEvent, screen } from 'expo-router/testing-library';

import { transferItem, transferListEmpty, transferListOf, transfersOk } from '@/test/apiFixtures';
import { captureAppState, type AppStateCapture } from '@/test/appStateMock';
import { reply } from '@/test/fetchMock';
import { openSheet, rowNames, settleRequests, showSheet, spyOnReaderFocus, typeSearch } from '@/test/transferListHelpers';
import { answerListWith, returnFromBackground } from '@/test/transferListRefreshHelpers';
import {
  amountSheetTitle,
  applyAmountRange,
  boundField,
  renderLoadedList,
  typeShownAmount,
} from '@/test/transferListSheetHelpers';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

afterEach(jest.restoreAllMocks);

const MESSI = 'Lionel Andres Messi';
const RANGE_CHIP = 'Filtro de valor: de 2.000 a 4.000 dólares';
const EMPTY_TITLE = 'Aún no tienes transferencias';

let appState: AppStateCapture;

beforeEach(() => {
  appState = captureAppState();
});

// Con «mes» y 2.000,00–4.000,00 aplicados solo se ve Messi.
async function renderFilteredList() {
  await renderLoadedList();
  await typeSearch('mes');
  await applyAmountRange('2.000,00', '4.000,00');
  expect(screen.getByText('1 de 3 transferencias')).toBeOnTheScreen();
}

// La app vuelve del segundo plano y la recarga responde con el cuerpo dado.
async function refreshWith(body: unknown) {
  answerListWith(reply(200, body));
  await returnFromBackground(appState);
  await settleRequests();
}

function expectFiltersKept() {
  expect(screen.getByLabelText('Nombre del destinatario')).toHaveDisplayValue('mes');
  expect(screen.getByRole('button', { name: RANGE_CHIP })).toBeOnTheScreen();
}

const scheduledMessi = transferItem({ name: MESSI, document: '11029920288', value: 2500, date: '2026-11-01' });

describe('TransferListScreen: filtros sobre los datos de una recarga', () => {
  it.each([
    { received: 'las 3 reales', body: transferListOf(transfersOk), names: [MESSI], counter: '1 de 3 transferencias' },
    {
      received: 'las 3 reales y Messi programada',
      body: transferListOf([...transfersOk, scheduledMessi]),
      names: [MESSI, MESSI],
      counter: '2 de 4 transferencias',
    },
    {
      received: 'solo Ronaldo y Valverde',
      body: transferListOf([transfersOk[0], transfersOk[2]]),
      names: [],
      counter: '0 de 2 transferencias',
    },
    { received: '[]', body: transferListEmpty.direct, names: [], counter: null },
  ])('una recarga con éxito reaplica la búsqueda y los filtros sobre los datos nuevos', async ({ received, body, names, counter }) => {
    await renderFilteredList();

    await refreshWith(body);

    expect(rowNames()).toEqual(names);
    if (counter) {
      expect(screen.getByText(counter)).toBeOnTheScreen();
      expectFiltersKept();
    } else {
      expect(screen.queryByRole('header', { name: EMPTY_TITLE })).toBeOnTheScreen();
    }
    if (received === 'las 3 reales y Messi programada') expect(screen.getByText('Programada')).toBeOnTheScreen();
    if (received === 'solo Ronaldo y Valverde') {
      expect(screen.getByText('Sin resultados para estos filtros')).toBeOnTheScreen();
    }
  });

});

describe('TransferListScreen: hoja abierta durante una recarga', () => {
  it('una hoja abierta sigue abierta con lo escrito', async () => {
    await renderFilteredList();
    await openSheet('Valor');
    await showSheet();
    await fireEvent.changeText(boundField('Desde'), '');
    await typeShownAmount('Desde', '1.000,00');

    await refreshWith(transferListOf(transfersOk));

    expect(amountSheetTitle()).toBeOnTheScreen();
    expect(boundField('Desde')).toHaveDisplayValue('1.000,00');
    expect(boundField('Hasta')).toHaveDisplayValue('4.000,00');
  });

});

describe('TransferListScreen: filtros tras el vacío', () => {
  it('tras el vacío los filtros vuelven con la siguiente recarga con datos', async () => {
    await renderFilteredList();
    await refreshWith(transferListEmpty.direct);
    expect(screen.queryByRole('header', { name: EMPTY_TITLE })).toBeOnTheScreen();

    await refreshWith(transferListOf(transfersOk));

    expect(rowNames()).toEqual([MESSI]);
    expect(screen.getByText('1 de 3 transferencias')).toBeOnTheScreen();
    expectFiltersKept();
  });

});

describe('TransferListScreen: filtros tras el formulario', () => {
  it('los filtros siguen tras abrir Nueva transferencia desde el vacío y volver', async () => {
    await renderFilteredList();
    await refreshWith(transferListEmpty.direct);
    answerListWith(reply(200, transferListOf(transfersOk)));

    await fireEvent.press(screen.getByRole('button', { name: 'Nueva transferencia' }));
    expect(screen).toHavePathname('/nueva-transferencia');
    await act(async () => router.back());
    await settleRequests();

    expect(screen).toHavePathname('/transferencias');
    expect(rowNames()).toEqual([MESSI]);
    expect(screen.getByText('1 de 3 transferencias')).toBeOnTheScreen();
    expectFiltersKept();
  });

});

describe('TransferListScreen: filtros tras el segundo plano', () => {
  it('los filtros siguen tras el segundo plano', async () => {
    await renderFilteredList();

    await refreshWith(transferListOf([...transfersOk]));

    expect(rowNames()).toEqual([MESSI]);
    expect(screen.getByText('1 de 3 transferencias')).toBeOnTheScreen();
    expectFiltersKept();
  });
});

describe('TransferListScreen: hoja abierta cuando la recarga deja el vacío', () => {
  it.each([
    { sheet: 'con la hoja de valor abierta', open: true },
    { sheet: 'sin hoja abierta', open: false },
  ])('si la recarga deja el listado vacío la hoja se cierra y el foco va al encabezado', async ({ open }) => {
    await renderFilteredList();
    if (open) {
      await openSheet('Valor');
      await showSheet();
      await fireEvent.changeText(boundField('Desde'), '');
      await typeShownAmount('Desde', '1.000,00');
    }
    const readerFocus = spyOnReaderFocus();

    await refreshWith(transferListEmpty.direct);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(16);
    });

    expect(screen.queryByRole('header', { name: EMPTY_TITLE })).toBeOnTheScreen();
    expect(amountSheetTitle()).not.toBeOnTheScreen();
    expect(readerFocus()).toEqual(open ? [EMPTY_TITLE] : []);

    await refreshWith(transferListOf(transfersOk));
    expect(amountSheetTitle()).not.toBeOnTheScreen();
    await openSheet('Valor');
    expect(boundField('Desde')).toHaveDisplayValue('2.000,00');
  });
});
