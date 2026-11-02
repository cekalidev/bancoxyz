import { act, fireEvent, screen } from 'expo-router/testing-library';

import { ERROR_MESSAGES } from '@/services/api/errors';
import { balanceOk } from '@/test/apiFixtures';
import { mockApiRoutes, reply, type Reply } from '@/test/fetchMock';
import {
  balanceRequests,
  politeRegionWith,
  renderHome,
  settleRequests,
  spyOnAnnouncements,
} from '@/test/homeHelpers';
import { advancePastTimeout } from '@/test/timers';

const NETWORK = ERROR_MESSAGES.network;
const UNKNOWN = ERROR_MESSAGES.unknown;
const SERVER_TEXT = 'Saldo bloqueado por auditoría interna';

const firstLoadFailures: [string, Reply, string][] = [
  ['sin red', 'networkError', NETWORK],
  ['tiempo agotado a los 15 s', 'pending', NETWORK],
  ['400', reply(400, { message: SERVER_TEXT }), UNKNOWN],
  ['403', reply(403, { message: SERVER_TEXT }), UNKNOWN],
  ['500', reply(500, { message: SERVER_TEXT }), UNKNOWN],
  ['cuerpo no JSON', { raw: '<html>Error interno</html>', status: 200 }, UNKNOWN],
  ['forma inesperada', reply(200, { currency: 'usd', accountBalance: '1800' }), UNKNOWN],
];

// Monta el Inicio con la respuesta dada y deja que la primera carga termine.
async function failFirstLoad(balance: Reply) {
  await renderHome({ balance });
  if (balance === 'pending') {
    await act(async () => {
      await advancePastTimeout();
    });
  }
  await settleRequests();
}

describe('HomeScreen: error en la primera carga', () => {
  afterEach(jest.restoreAllMocks);

  it.each(firstLoadFailures)(
    'si la primera carga falla muestra el aviso con su mensaje y Reintentar en lugar de la tarjeta (%s)',
    async (_case, balance, message) => {
      await failFirstLoad(balance);

      expect(screen.getByText(message)).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled();
      expect(screen.queryByText('Saldo disponible')).not.toBeOnTheScreen();
      expect(screen.queryByLabelText('Cargando…')).not.toBeOnTheScreen();
      expect(screen.queryByText(ERROR_MESSAGES.badRequest)).not.toBeOnTheScreen();
    },
  );

  it.each([400, 500])('nunca muestra el texto del servidor ni reintenta solo (%d)', async (status) => {
    await failFirstLoad(reply(status, { message: SERVER_TEXT, error: SERVER_TEXT }));

    await act(async () => {
      await jest.advanceTimersByTimeAsync(60000);
    });

    expect(screen.getByText(UNKNOWN)).toBeOnTheScreen();
    expect(screen.queryByText(SERVER_TEXT, { exact: false })).not.toBeOnTheScreen();
    expect(balanceRequests()).toHaveLength(1);
  });
});

describe('HomeScreen: anuncio del error en la primera carga', () => {
  afterEach(jest.restoreAllMocks);

  it('anuncia el aviso en iOS', async () => {
    const announce = spyOnAnnouncements('ios');

    await failFirstLoad('networkError');

    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith(NETWORK);
  });

  it('anuncia el aviso en Android con su texto dentro de una región que ya existía', async () => {
    const announce = spyOnAnnouncements('android');
    await renderHome({ balance: 'networkError' });
    const regionsBefore = screen.container.queryAll((node) => node.props.accessibilityLiveRegion === 'polite');

    await settleRequests();

    const region = politeRegionWith(NETWORK);
    expect(region).toBeDefined();
    expect(regionsBefore).toContain(region);
    expect(announce).not.toHaveBeenCalled();
  });
});

// Cambia la respuesta del saldo para la siguiente petición y pulsa Reintentar.
async function retryWith(balance: Reply) {
  mockApiRoutes({ balance });
  await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
}

describe('HomeScreen: Reintentar tras fallar la primera carga', () => {
  afterEach(jest.restoreAllMocks);

  it('Reintentar tras fallar la primera carga quita el aviso, vuelve el skeleton y pide una vez', async () => {
    await failFirstLoad('networkError');

    await retryWith('pending');

    expect(screen.queryByText(NETWORK)).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Cargando…')).toBeBusy();
    expect(balanceRequests()).toHaveLength(2);
  });

  it.each([
    ['éxito', reply(200, balanceOk)],
    ['sin red', 'networkError' as const],
  ])('el resultado del reintento se muestra como la primera carga (%s)', async (_case, balance) => {
    await failFirstLoad('networkError');
    await retryWith(balance);
    await settleRequests();

    if (balance === 'networkError') {
      expect(screen.getByText(NETWORK)).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled();
      expect(screen.queryByText('Saldo disponible')).not.toBeOnTheScreen();
    } else {
      expect(screen.getByText('US$ 1.800,00')).toBeOnTheScreen();
      expect(screen.queryByText(NETWORK)).not.toBeOnTheScreen();
    }
    expect(screen.queryByLabelText('Cargando…')).not.toBeOnTheScreen();
    expect(balanceRequests()).toHaveLength(2);
  });
});
