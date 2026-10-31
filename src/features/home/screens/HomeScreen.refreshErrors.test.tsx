import { router } from 'expo-router';
import { act, fireEvent, screen } from 'expo-router/testing-library';
import { StyleSheet } from 'react-native';

import * as sessionActions from '@/features/auth/sessionActions';
import { ERROR_MESSAGES } from '@/services/api/errors';
import { sessionUnauthorized } from '@/test/apiFixtures';
import { mockApiRoutes, reply, type Reply } from '@/test/fetchMock';
import { politeRegionWith, renderHome, settleRequests, spyOnAnnouncements } from '@/test/homeHelpers';
import { spacing } from '@/theme';

const NETWORK = ERROR_MESSAGES.network;
const UNKNOWN = ERROR_MESSAGES.unknown;
const SERVER_TEXT = 'Saldo bloqueado por auditoría interna';
const AMOUNT = 'US$ 1.800,00';

type Node = ReturnType<typeof screen.getByText>;

const refreshFailures: [string, Reply, string][] = [
  ['sin red', 'networkError', NETWORK],
  ['tiempo agotado a los 15 s', 'pending', NETWORK],
  ['400', reply(400, { message: SERVER_TEXT }), UNKNOWN],
  ['403', reply(403, { message: SERVER_TEXT }), UNKNOWN],
  ['500', reply(500, { message: SERVER_TEXT }), UNKNOWN],
  ['cuerpo no JSON', { raw: '<html>Error interno</html>', status: 200 }, UNKNOWN],
  ['forma inesperada', reply(200, { currency: 'usd', accountBalance: '1800' }), UNKNOWN],
];

// Carga la cifra, sale a otra pantalla, cambia la respuesta y vuelve al Inicio para refrescar.
// Si la respuesta no llega, avanza el reloj hasta que se agote el tiempo de espera.
async function failRefresh(balance: Reply) {
  await renderHome();
  await settleRequests();
  expect(screen.getByText(AMOUNT)).toBeOnTheScreen();

  await act(async () => router.push('/transferencias'));
  expect(screen).toHavePathname('/transferencias');
  mockApiRoutes({ balance });
  await act(async () => router.back());
  expect(screen).toHavePathname('/');
  if (balance === 'pending') {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(15000);
    });
  }
  await settleRequests();
}

function ancestorsOf(node: Node) {
  const ancestors: Node[] = [];
  for (let current = node.parent; current; current = current.parent) ancestors.push(current);
  return ancestors;
}

// Posición del nodo en el recorrido del árbol, que es el orden de lectura.
function treeIndex(node: Node) {
  return screen.container.queryAll(() => true).indexOf(node);
}

describe('HomeScreen: error en un refresco', () => {
  afterEach(jest.restoreAllMocks);

  it.each(refreshFailures)(
    'si falla un refresco conserva la cifra y muestra el aviso encima de la tarjeta (%s)',
    async (_case, balance, message) => {
      await failRefresh(balance);

      const notice = screen.getByText(message);
      const retry = screen.getByRole('button', { name: 'Reintentar' });
      const amount = screen.getByText(AMOUNT);
      expect(notice).toBeOnTheScreen();
      expect(retry).toBeEnabled();
      expect(screen.queryByText(SERVER_TEXT, { exact: false })).not.toBeOnTheScreen();
      expect(screen.queryByLabelText('Cargando…')).not.toBeOnTheScreen();
      expect(treeIndex(notice)).toBeLessThan(treeIndex(amount));
      expect(retry.parent).toHaveStyle({ alignSelf: 'flex-end' });
      const spaced = ancestorsOf(amount).filter(
        (node) => StyleSheet.flatten(node.props.style)?.marginTop === spacing.md,
      );
      expect(spaced).toHaveLength(1);
    },
  );
});

describe('HomeScreen: anuncio del error en un refresco', () => {
  afterEach(jest.restoreAllMocks);

  it('anuncia el aviso del refresco en iOS', async () => {
    const announce = spyOnAnnouncements('ios');

    await failRefresh('networkError');

    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith(NETWORK);
  });

  it('anuncia el aviso del refresco en Android dentro de su región', async () => {
    const announce = spyOnAnnouncements('android');

    await failRefresh('networkError');

    expect(politeRegionWith(NETWORK)).toBeDefined();
    expect(announce).not.toHaveBeenCalled();
  });
});

const UNAUTHORIZED = reply(401, sessionUnauthorized);

// En la app el 401 cierra la sesión y desmonta el Inicio; aquí se sustituye ese cierre para seguir viéndolo.
// Se espía antes de montar porque `renderHome` conecta el cierre a la API; `restoreAllMocks` lo devuelve.
function keepHomeMounted() {
  return jest.spyOn(sessionActions, 'expireSession').mockImplementation(() => undefined);
}

function expectOnlyErrorMessage(expected: string | null) {
  for (const message of Object.values(ERROR_MESSAGES)) {
    if (message !== expected) expect(screen.queryByText(message)).not.toBeOnTheScreen();
  }
}

type UnauthorizedCase = {
  // Lleva el Inicio al estado previo y devuelve cómo provocar el 401 desde ahí.
  reach: () => Promise<() => Promise<void>>;
  expectUnchanged: () => void;
};

const unauthorizedCases: [string, UnauthorizedCase][] = [
  [
    'skeleton',
    {
      reach: async () => async () => {
        await renderHome({ balance: UNAUTHORIZED });
      },
      expectUnchanged: () => {
        expect(screen.getByLabelText('Cargando…')).toBeOnTheScreen();
        expect(screen.queryByText(AMOUNT)).not.toBeOnTheScreen();
        expectOnlyErrorMessage(null);
      },
    },
  ],
  [
    'cifra',
    {
      reach: async () => {
        await renderHome();
        await settleRequests();
        expect(screen.getByText(AMOUNT)).toBeOnTheScreen();
        return async () => {
          await act(async () => router.push('/transferencias'));
          mockApiRoutes({ balance: UNAUTHORIZED });
          await act(async () => router.back());
        };
      },
      expectUnchanged: () => {
        expect(screen.getByText(AMOUNT)).toBeOnTheScreen();
        expect(screen.queryByLabelText('Cargando…')).not.toBeOnTheScreen();
        expectOnlyErrorMessage(null);
      },
    },
  ],
  [
    'aviso previo',
    {
      reach: async () => {
        await failRefresh('networkError');
        expect(screen.getByText(NETWORK)).toBeOnTheScreen();
        return async () => {
          mockApiRoutes({ balance: UNAUTHORIZED });
          await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
        };
      },
      expectUnchanged: () => {
        expect(screen.getByText(NETWORK)).toBeOnTheScreen();
        expect(screen.getByText(AMOUNT)).toBeOnTheScreen();
        expectOnlyErrorMessage(NETWORK);
      },
    },
  ],
];

describe('HomeScreen: sesión caducada durante la carga del saldo', () => {
  afterEach(jest.restoreAllMocks);

  it.each(unauthorizedCases)(
    'un 401 no cambia lo que se ve ni anuncia nada (%s)',
    async (_case, { reach, expectUnchanged }) => {
      const expireSession = keepHomeMounted();
      const announce = spyOnAnnouncements('ios');
      const answerWith401 = await reach();
      announce.mockClear();

      await answerWith401();
      await settleRequests();

      expect(expireSession).toHaveBeenCalledTimes(1);
      expect(screen).toHavePathname('/');
      expectUnchanged();
      expect(announce).not.toHaveBeenCalled();
    },
  );
});
