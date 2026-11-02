import { act, fireEvent, screen } from 'expo-router/testing-library';

import { ERROR_MESSAGES } from '@/services/api/errors';
import { balanceOk } from '@/test/apiFixtures';
import { mockApiRoutes, reply, type Reply } from '@/test/fetchMock';
import { balanceResponse, politeRegionWith, settleRequests, spyOnAnnouncements } from '@/test/homeHelpers';
import { advancePastTimeout } from '@/test/timers';
import { formBalanceRequests, renderTransferFlow } from '@/test/transferHelpers';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

const NETWORK = ERROR_MESSAGES.network;
const UNKNOWN = ERROR_MESSAGES.unknown;
const SERVER_TEXT = 'Saldo bloqueado por auditoría interna';

const loadFailures: [string, Reply, string][] = [
  ['sin red', 'networkError', NETWORK],
  ['tiempo agotado a los 15 s', 'pending', NETWORK],
  ['400', reply(400, { message: SERVER_TEXT }), UNKNOWN],
  ['403', reply(403, { message: SERVER_TEXT }), UNKNOWN],
  ['500', reply(500, { message: SERVER_TEXT }), UNKNOWN],
  ['forma inesperada', reply(200, { currency: 'usd', accountBalance: '1800' }), UNKNOWN],
];

// Abre el formulario con la respuesta dada y deja que su carga termine.
async function failFormLoad(balance: Reply) {
  await renderTransferFlow({ balance });
  if (balance === 'pending') {
    await act(async () => {
      await advancePastTimeout();
    });
  }
  await settleRequests();
}

// El saldo del Inicio responde bien: así el único aviso es el del formulario.
function homeLoadsFine() {
  jest.spyOn(global, 'fetch').mockImplementationOnce(async () => balanceResponse(1800));
}

afterEach(jest.restoreAllMocks);

describe('NewTransferScreen: error al cargar el saldo', () => {
  it.each(loadFailures)(
    'si el saldo falla muestra el aviso con su mensaje y Reintentar en lugar del formulario: «%s»',
    async (_case, balance, message) => {
      await failFormLoad(balance);

      expect(screen.getByText(message)).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled();
      expect(screen.queryByLabelText('Valor')).not.toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Continuar' })).not.toBeOnTheScreen();
      expect(screen.queryByText('Disponible pronto')).not.toBeOnTheScreen();
      expect(screen.queryByLabelText('Cargando…')).not.toBeOnTheScreen();
      expect(screen.queryByText(ERROR_MESSAGES.badRequest)).not.toBeOnTheScreen();
    },
  );

  it.each([400, 500])('nunca muestra texto del servidor ni reintenta solo: «%s»', async (status) => {
    await failFormLoad(reply(status, { message: SERVER_TEXT, error: SERVER_TEXT }));

    await act(async () => {
      await jest.advanceTimersByTimeAsync(60000);
    });

    expect(screen.getByText(UNKNOWN)).toBeOnTheScreen();
    expect(screen.queryByText(SERVER_TEXT, { exact: false })).not.toBeOnTheScreen();
    expect(formBalanceRequests()).toHaveLength(1);
  });
});

describe('NewTransferScreen: anuncio del error del saldo', () => {
  it('anuncia el aviso del saldo: «iOS»', async () => {
    const announce = spyOnAnnouncements('ios');
    homeLoadsFine();

    await failFormLoad('networkError');

    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith(NETWORK);
  });

  it('anuncia el aviso del saldo: «Android»', async () => {
    const announce = spyOnAnnouncements('android');
    homeLoadsFine();

    await failFormLoad('networkError');

    expect(politeRegionWith(NETWORK)).toBeDefined();
    expect(announce).not.toHaveBeenCalled();
  });
});

// Cambia la respuesta del saldo para la siguiente petición y pulsa Reintentar.
async function retryWith(balance: Reply) {
  mockApiRoutes({ balance });
  await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
}

describe('NewTransferScreen: Reintentar tras fallar el saldo', () => {
  it('Reintentar quita el aviso, vuelve el skeleton y pide una vez', async () => {
    await failFormLoad('networkError');

    await retryWith('pending');

    expect(screen.queryByText(NETWORK)).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Cargando…')).toBeBusy();
    expect(formBalanceRequests()).toHaveLength(2);
  });

  it.each([
    ['éxito', reply(200, balanceOk)],
    ['sin red', 'networkError' as const],
  ])('el resultado del reintento se muestra como la primera carga: «%s»', async (_case, balance) => {
    await failFormLoad('networkError');
    await retryWith(balance);
    await settleRequests();

    if (balance === 'networkError') {
      expect(screen.getByText(NETWORK)).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled();
      expect(screen.queryByLabelText('Valor')).not.toBeOnTheScreen();
    } else {
      expect(screen.getByLabelText('Valor')).toBeOnTheScreen();
      expect(screen.getByText('Disponible: US$\u00a01.800,00')).toBeOnTheScreen();
      expect(screen.queryByText(NETWORK)).not.toBeOnTheScreen();
    }
    expect(screen.queryByLabelText('Cargando…')).not.toBeOnTheScreen();
    expect(formBalanceRequests()).toHaveLength(2);
  });
});
