import { fireEvent, screen } from 'expo-router/testing-library';

import { transferOk } from '@/test/apiFixtures';
import { mockApiRoutes, reply, type Reply } from '@/test/fetchMock';
import { politeRegionWith, settleRequests, spyOnAnnouncements } from '@/test/homeHelpers';
import {
  chooseDate,
  fillValidForm,
  letPickerClose,
  renderTransferFlow,
  transferRequests,
} from '@/test/transferHelpers';
import type { CalendarDate } from '@/utils/date';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

const NBSP = ' ';
const MONEY = `US$${NBSP}1.250,00`;
const REJECTED = 'No pudimos hacer la transferencia. Revisa los datos e inténtalo de nuevo.';
const REJECTION = reply(400, { message: 'Bad Request: dados inválidos' });

afterEach(jest.restoreAllMocks);

const pressButton = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

// Rellena el formulario con 1.250,00 al CPF de prueba (hoy si no se elige otra fecha),
// llega a la confirmación y confirma.
async function confirmWith(transfer: Reply, date?: CalendarDate) {
  await renderTransferFlow({ transfer });
  await settleRequests();
  await fillValidForm();
  if (date) {
    await chooseDate(date);
    await letPickerClose();
  }
  await pressButton('Continuar');
  await pressButton('Confirmar transferencia');
  await settleRequests();
}

describe('ConfirmTransferScreen: éxito', () => {
  it('un éxito con fecha de hoy muestra Transferencia realizada con el importe, el destinatario y la fecha', async () => {
    await confirmWith(reply(200, transferOk));

    expect(screen).toHavePathname('/nueva-transferencia/resultado');
    expect(screen.getByRole('header', { name: 'Transferencia realizada' })).toBeOnTheScreen();
    expect(screen.getByText(`Enviaste ${MONEY} al CPF 123.456.789-00.`)).toBeOnTheScreen();
    expect(screen.getByText('Fecha: 31/10/2026')).toBeOnTheScreen();
  });

  it('un éxito con fecha futura muestra Transferencia programada', async () => {
    await confirmWith(reply(200, transferOk), { year: 2026, month: 11, day: 15 });

    expect(screen).toHavePathname('/nueva-transferencia/resultado');
    expect(screen.getByRole('header', { name: 'Transferencia programada' })).toBeOnTheScreen();
    expect(screen.getByText(`Se enviarán ${MONEY} al CPF 123.456.789-00 el 15/11/2026.`)).toBeOnTheScreen();
  });
});

describe('ConfirmTransferScreen: rechazada', () => {
  it('un 400 deja la confirmación con el aviso de error anunciado y las acciones disponibles', async () => {
    const announce = spyOnAnnouncements('ios');

    await confirmWith(REJECTION);

    expect(screen).toHavePathname('/nueva-transferencia/confirmar');
    expect(screen.getByText(REJECTED)).toBeOnTheScreen();
    expect(announce).toHaveBeenCalledWith(REJECTED);
    expect(politeRegionWith(REJECTED)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Confirmar transferencia' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Editar datos' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Volver' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Transfiriendo…' })).not.toBeOnTheScreen();
  });

});

describe('ConfirmTransferScreen: después de un rechazo', () => {
  it('volver a confirmar quita el aviso y envía otra petición', async () => {
    await confirmWith(REJECTION);
    expect(screen.getByText(REJECTED)).toBeOnTheScreen();
    mockApiRoutes({ transfer: 'pending' });

    await pressButton('Confirmar transferencia');

    expect(screen.queryByText(REJECTED)).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Transfiriendo…' })).toBeOnTheScreen();
    expect(transferRequests()).toHaveLength(2);
  });

  it('tras Editar datos y Continuar el aviso no aparece', async () => {
    await confirmWith(REJECTION);
    expect(screen.getByText(REJECTED)).toBeOnTheScreen();

    await pressButton('Editar datos');
    expect(screen).toHavePathname('/nueva-transferencia');
    await pressButton('Continuar');

    expect(screen).toHavePathname('/nueva-transferencia/confirmar');
    expect(screen.queryByText(REJECTED)).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Confirmar transferencia' })).toBeOnTheScreen();
  });
});
