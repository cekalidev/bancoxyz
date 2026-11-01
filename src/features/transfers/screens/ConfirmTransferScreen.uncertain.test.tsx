import { act, fireEvent, screen } from 'expo-router/testing-library';

import { REJECTED_MESSAGE } from '@/features/transfers/transferText';
import { useTransferStore } from '@/features/transfers/transferStore';
import { ERROR_MESSAGES } from '@/services/api/errors';
import { exposedStrings } from '@/test/a11yTree';
import { transferBodies, transferOk } from '@/test/apiFixtures';
import { mockFetchPendingIgnoringAbort, reply, type Reply } from '@/test/fetchMock';
import { settleRequests } from '@/test/homeHelpers';
import { goToConfirm, renderTransferFlow } from '@/test/transferHelpers';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

const NBSP = ' ';
const TITLE = 'No pudimos confirmar si la transferencia se realizó';
const LINES = [
  'Puede que se haya hecho. Antes de volver a enviarla, compruébala con estos datos:',
  `Valor: US$${NBSP}1.250,00`,
  'Destinatario: CPF 123.456.789-00',
  'Fecha: 31/10/2026',
];

afterEach(jest.restoreAllMocks);

const pressButton = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const waitTimeout = () => act(() => jest.advanceTimersByTimeAsync(15000));

// Llega a la confirmación con 1.250,00 al CPF de prueba para hoy y confirma.
async function openConfirmation(transfer?: Reply) {
  await renderTransferFlow(transfer ? { transfer } : {});
  await settleRequests();
  await goToConfirm();
}

const CAUSES: { name: string; transfer: Reply }[] = [
  { name: 'sin red', transfer: 'networkError' },
  { name: '15 s sin respuesta', transfer: 'pending' },
  { name: '403', transfer: reply(403, { message: 'Forbidden' }) },
  { name: '500', transfer: reply(500, { message: 'Internal Server Error' }) },
  { name: '503', transfer: reply(503, { message: 'Service Unavailable' }) },
  { name: '404', transfer: reply(404, { message: 'Not Found' }) },
  { name: '429', transfer: reply(429, { message: 'Too Many Requests' }) },
  { name: '200 vacío', transfer: reply(200, transferBodies.empty) },
  { name: '200 sin status', transfer: reply(200, transferBodies.withoutStatus) },
  { name: '200 con otro status', transfer: reply(200, transferBodies.otherStatus) },
  { name: '200 que no es JSON', transfer: { raw: '<html>Ok</html>', status: 200 } },
];

function expectUncertainResult() {
  expect(screen).toHavePathname('/nueva-transferencia/resultado');
  expect(screen.getAllByRole('header', { name: TITLE })).toHaveLength(1);
  for (const line of LINES) expect(screen.getByText(line)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Volver al inicio' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Ver transferencias' })).not.toBeOnTheScreen();
}

describe('ConfirmTransferScreen: incierto', () => {
  it.each(CAUSES)(
    'cada causa muestra el incierto con los datos exactos del intento y solo Volver al inicio ($name)',
    async ({ transfer }) => {
      await openConfirmation(transfer);

      await pressButton('Confirmar transferencia');
      // Sin respuesta solo se avanza el reloj: esperar a la petición no terminaría nunca.
      await (transfer === 'pending' ? waitTimeout() : settleRequests());

      expectUncertainResult();
    },
  );

  it('una respuesta que llega tras los 15 s se ignora', async () => {
    await openConfirmation();
    // La transferencia no responde a tiempo ni atiende a la cancelación: su respuesta llega después.
    const late = mockFetchPendingIgnoringAbort();
    await pressButton('Confirmar transferencia');
    await waitTimeout();
    expectUncertainResult();

    late.resolve(200, transferOk);
    await settleRequests();

    expectUncertainResult();
    expect(screen.queryByText('Transferencia realizada')).not.toBeOnTheScreen();
    expect(useTransferStore.getState().attempts).toHaveLength(1);
    expect(useTransferStore.getState().lastAttempt?.outcome).toBe('uncertain');
  });
});

const SERVER_REPLIES: { name: string; transfer: Reply; message?: string }[] = [
  { name: '200 con éxito', transfer: reply(200, transferOk), message: transferOk.message },
  { name: '400', transfer: reply(400, { message: 'Bad Request: dados inválidos' }), message: 'Bad Request: dados inválidos' },
  { name: '403', transfer: reply(403, { message: 'Forbidden: acesso negado' }), message: 'Forbidden: acesso negado' },
  { name: '500', transfer: reply(500, { message: 'Erro interno do servidor' }), message: 'Erro interno do servidor' },
  { name: '200 sin status', transfer: reply(200, transferBodies.withoutStatus), message: transferOk.message },
  {
    name: '200 con otro status',
    transfer: reply(200, transferBodies.otherStatus),
    message: transferBodies.otherStatus.message,
  },
  { name: 'sin red', transfer: 'networkError' },
  { name: '15 s sin respuesta', transfer: 'pending' },
];

describe('ConfirmTransferScreen: textos de la respuesta', () => {
  it.each(SERVER_REPLIES)(
    'ninguna respuesta muestra texto del servidor ni los mensajes genéricos ($name)',
    async ({ transfer, message }) => {
      await openConfirmation(transfer);

      await pressButton('Confirmar transferencia');
      await (transfer === 'pending' ? waitTimeout() : settleRequests());

      const forbidden = [...(message ? [message] : []), ...Object.values(ERROR_MESSAGES)];
      // El aviso del 400 contiene «Revisa los datos e inténtalo de nuevo.» como parte de su propio texto.
      const leaked = exposedStrings().filter(
        (text) => text !== REJECTED_MESSAGE && forbidden.some((item) => text.includes(item)),
      );
      expect(leaked).toEqual([]);
    },
  );
});
