import { act, fireEvent, screen } from 'expo-router/testing-library';

import { transferOk } from '@/test/apiFixtures';
import { captureAppState } from '@/test/appStateMock';
import { mockFetchPendingEach, reply, type Reply } from '@/test/fetchMock';
import { settleRequests } from '@/test/homeHelpers';
import {
  chooseDate,
  letPickerClose,
  pasteInto,
  renderTransferFlow,
  sentTransferBody,
  transferRequests,
  typeAmount,
} from '@/test/transferHelpers';
import type { CalendarDate } from '@/utils/date';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

afterEach(jest.restoreAllMocks);

const pressButton = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

type FormInput = { digits: string; document: string; date?: CalendarDate; transfer?: Reply };

// Rellena el formulario y llega a la confirmación; la transferencia responde con éxito si no se indica otra cosa.
async function openConfirmationWith({ digits, document, date, transfer = reply(200, transferOk) }: FormInput) {
  await renderTransferFlow({ transfer });
  await settleRequests();
  await typeAmount(digits);
  await pasteInto('Documento del destinatario', document);
  if (date) {
    await chooseDate(date);
    await letPickerClose();
  }
  await pressButton('Continuar');
}

describe('ConfirmTransferScreen: cuerpo de la petición', () => {
  it.each([
    {
      name: '1.250,00 con CPF pegado el 15/11/2026',
      input: { digits: '125000', document: '123.456.789-00', date: { year: 2026, month: 11, day: 15 } },
      value: 1250,
      transferDate: '2026-11-15',
    },
    { name: '0,30', input: { digits: '30', document: '12345678900' }, value: 0.3, transferDate: '2026-10-31' },
    { name: '1.500,50', input: { digits: '150050', document: '12345678900' }, value: 1500.5, transferDate: '2026-10-31' },
    { name: '0,01', input: { digits: '1', document: '12345678900' }, value: 0.01, transferDate: '2026-10-31' },
  ])(
    'envía el valor, la moneda del saldo, el documento solo con dígitos y el día local ($name)',
    async ({ input, value, transferDate }) => {
      await openConfirmationWith(input);

      await pressButton('Confirmar transferencia');
      await settleRequests();

      expect(transferRequests()).toHaveLength(1);
      expect(sentTransferBody()).toEqual({
        value,
        currency: 'USD',
        payeerDocument: '12345678900',
        transferDate,
      });
    },
  );
});

describe('ConfirmTransferScreen: doble toque', () => {
  it.each([2, 3])('dos o más toques seguidos envían una sola transferencia (%i toques)', async (taps) => {
    await openConfirmationWith({ digits: '125000', document: '12345678900' });
    const confirm = screen.getByRole('button', { name: 'Confirmar transferencia' });

    // Los toques llegan en el mismo tick, antes de que la pantalla vuelva a pintarse.
    await act(async () => {
      await Promise.all(Array.from({ length: taps }, () => fireEvent.press(confirm)));
    });
    await settleRequests();

    expect(transferRequests()).toHaveLength(1);
  });
});

describe('ConfirmTransferScreen: enviando', () => {
  it('mientras envía el botón dice Transfiriendo…, está inactivo y ocupado y desaparecen Editar datos y Volver', async () => {
    await openConfirmationWith({ digits: '125000', document: '12345678900', transfer: 'pending' });
    expect(screen.getByRole('button', { name: 'Volver' })).toBeOnTheScreen();

    await pressButton('Confirmar transferencia');

    const sending = screen.getByRole('button', { name: 'Transfiriendo…' });
    expect(sending).toBeDisabled();
    expect(sending).toBeBusy();
    expect(screen.queryByRole('button', { name: 'Confirmar transferencia' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Editar datos' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Volver' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('progressbar')).not.toBeOnTheScreen();
    expect(screen.queryByLabelText('Cargando…')).not.toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Confirmar transferencia' })).toBeOnTheScreen();
    expect(transferRequests()).toHaveLength(1);
  });
});

describe('ConfirmTransferScreen: segundo plano', () => {
  it('pasar a segundo plano y volver durante el envío mantiene Transfiriendo… y muestra un único resultado', async () => {
    const appState = captureAppState();
    await openConfirmationWith({ digits: '125000', document: '12345678900' });
    // Desde aquí cada petición espera a que el test la responda; la transferencia es la primera.
    const pending = mockFetchPendingEach();
    await pressButton('Confirmar transferencia');

    await appState.emit('background');
    await appState.emit('active');

    expect(screen.getByRole('button', { name: 'Transfiriendo…' })).toBeBusy();
    expect(screen.queryByRole('button', { name: 'Confirmar transferencia' })).not.toBeOnTheScreen();
    pending.resolve(0, 200, transferOk);
    await settleRequests();

    expect(screen).toHavePathname('/nueva-transferencia/resultado');
    expect(screen.getAllByRole('header', { name: 'Transferencia realizada' })).toHaveLength(1);
    expect(transferRequests()).toHaveLength(1);
  });
});
