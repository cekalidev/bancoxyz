import { userEvent } from '@testing-library/react-native';
import { act, screen, within } from 'expo-router/testing-library';

import { transferItem, transferListOf, transfersOk } from '@/test/apiFixtures';
import { captureAppState } from '@/test/appStateMock';
import { reply } from '@/test/fetchMock';
import { listRequests, renderTransferList, rowNames, rowOf, settleRequests } from '@/test/transferListHelpers';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

afterEach(jest.restoreAllMocks);

describe('TransferListScreen: contenido de las filas', () => {
  it('cada fila muestra su documento, su fecha y el importe con la moneda de esa transferencia', async () => {
    const brazilian = transferItem({
      name: 'Ana Souza',
      document: '12345',
      value: 250,
      currency: 'BRL',
      date: '2024-06-12',
    });
    await renderTransferList({ list: reply(200, transferListOf([...transfersOk, brazilian])) });

    expect(await screen.findByText('4 transferencias')).toBeOnTheScreen();
    const expectedRows = [
      ['Ronaldo de Assis Moreira', 'CPF 120.199.101-77 · 25/08/2024', 'US$ 1.000,00'],
      ['Lionel Andres Messi', 'CPF 110.299.202-88 · 12/06/2024', 'US$ 3.500,00'],
      ['Federico Valverde', 'CPF 130.399.303-99 · 12/06/2024', 'US$ 2.000,00'],
      ['Ana Souza', 'Documento 12345 · 12/06/2024', 'R$ 250,00'],
    ];
    expect(rowNames()).toEqual(expectedRows.map(([name]) => name));
    expectedRows.forEach(([name, detail, amount]) => {
      const row = within(rowOf(name));
      expect(row.getByText(name)).toBeOnTheScreen();
      expect(row.getByText(detail)).toBeOnTheScreen();
      expect(row.getByText(amount)).toBeOnTheScreen();
    });
  });
});

describe('TransferListScreen: orden de las filas', () => {
  it('una respuesta fuera de orden se muestra por fecha descendente, también con filtros', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const valverde = transferItem({ name: 'Federico Valverde', document: '13039930399', date: '2024-06-12' });
    const ronaldo = transferItem({ name: 'Ronaldo de Assis Moreira', document: '12019910177', date: '2024-08-25' });
    const messi = transferItem({ name: 'Lionel Andres Messi', document: '11029920288', date: '2024-06-12' });
    await renderTransferList({ list: reply(200, transferListOf([valverde, ronaldo, messi])) });

    expect(await screen.findByText('3 transferencias')).toBeOnTheScreen();
    const newestFirst = ['Ronaldo de Assis Moreira', 'Federico Valverde', 'Lionel Andres Messi'];
    expect(rowNames()).toEqual(newestFirst);

    await user.type(screen.getByLabelText('Nombre del destinatario'), 'e');

    expect(screen.getByText('3 de 3 transferencias')).toBeOnTheScreen();
    expect(rowNames()).toEqual(newestFirst);
  });
});

describe('TransferListScreen: transferencias repetidas', () => {
  it('dos transferencias idénticas se ven las dos y se cuentan, también tras filtrar y recargar', async () => {
    const consoleError = jest.spyOn(console, 'error');
    const appState = captureAppState();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const twins = [transferItem(), transferItem()];
    await renderTransferList({ list: reply(200, transferListOf(twins)) });

    expect(await screen.findByText('2 transferencias')).toBeOnTheScreen();
    const both = ['Ronaldo de Assis Moreira', 'Ronaldo de Assis Moreira'];
    expect(rowNames()).toEqual(both);

    await user.type(screen.getByLabelText('Nombre del destinatario'), 'Ronaldo');

    expect(screen.getByText('2 de 2 transferencias')).toBeOnTheScreen();
    expect(rowNames()).toEqual(both);

    await appState.emit('background');
    await appState.emit('active');
    await settleRequests();

    expect(listRequests()).toHaveLength(2);
    expect(screen.getByText('2 de 2 transferencias')).toBeOnTheScreen();
    expect(rowNames()).toEqual(both);
    const repeatedKeyWarning = consoleError.mock.calls.some((args) =>
      args.some((arg) => String(arg).includes('same key')),
    );
    expect(repeatedKeyWarning).toBe(false);
  });
});

const PAYEE = 'Ronaldo de Assis Moreira';
const SCHEDULED_TEXT = 'Programada';
const SCHEDULED_SUFFIX = /, programada$/;

// El icono dibujado dentro de la fila: el contenedor del svg es el nodo que lleva el viewBox.
function iconsIn(row: ReturnType<typeof rowOf>) {
  return row.queryAll((node) => node.props.vbWidth !== undefined);
}

function expectScheduledMarker(scheduled: boolean) {
  const row = rowOf(PAYEE);

  if (scheduled) {
    expect(within(row).getByText(SCHEDULED_TEXT)).toBeOnTheScreen();
    expect(iconsIn(row)).toHaveLength(1);
    expect(row).toHaveAccessibleName(SCHEDULED_SUFFIX);
    return;
  }
  expect(within(row).queryByText(SCHEDULED_TEXT)).not.toBeOnTheScreen();
  expect(iconsIn(row)).toHaveLength(0);
  expect(row).not.toHaveAccessibleName(SCHEDULED_SUFFIX);
}

// Avanza el reloj simulado hasta el instante dado, dejando correr los temporizadores del camino.
async function advanceClockTo(target: Date) {
  await act(() => jest.advanceTimersByTimeAsync(target.getTime() - Date.now()));
}

describe('TransferListScreen: transferencias programadas', () => {
  it.each([
    { date: '2026-10-30', scheduled: false },
    { date: '2026-10-31', scheduled: false },
    { date: '2026-11-01', scheduled: true },
    { date: '2024-06-12', scheduled: false },
  ])(
    'la fila de mañana muestra Programada con su icono y su etiqueta termina en programada',
    async ({ date, scheduled }) => {
      await renderTransferList({ list: reply(200, transferListOf([transferItem({ date })])) });

      expect(await screen.findByText('1 transferencia')).toBeOnTheScreen();
      expectScheduledMarker(scheduled);
    },
  );

  it('pasada la medianoche la etiqueta sigue hasta la siguiente recarga, que la quita', async () => {
    const appState = captureAppState();
    const list = reply(200, transferListOf([transferItem({ date: '2026-11-01' })]));
    await renderTransferList({ list, now: new Date(2026, 9, 31, 23, 59) });

    expect(await screen.findByText('1 transferencia')).toBeOnTheScreen();
    expectScheduledMarker(true);

    await advanceClockTo(new Date(2026, 10, 1, 0, 1));

    expect(listRequests()).toHaveLength(1);
    expectScheduledMarker(true);

    await appState.emit('background');
    await appState.emit('active');
    await settleRequests();

    expect(listRequests()).toHaveLength(2);
    expectScheduledMarker(false);
  });
});
