import { router } from 'expo-router';
import { act, screen } from 'expo-router/testing-library';

import { ERROR_MESSAGES } from '@/services/api/errors';
import { balanceBody, transferListWrapped } from '@/test/apiFixtures';
import { captureAppState, type AppStateCapture } from '@/test/appStateMock';
import { mockApiRoutes, reply } from '@/test/fetchMock';
import {
  balanceRequests,
  balanceResponse,
  holdNextResponse,
  renderHome,
  settleRequests,
  spyOnAnnouncements,
} from '@/test/homeHelpers';

const FIRST_AMOUNT = 'US$ 1.800,00';
const NEW_AMOUNT = 'US$ 2.500,00';
const LOADING = 'Cargando…';
const NETWORK = ERROR_MESSAGES.network;

async function loadHome() {
  await renderHome();
  await settleRequests();
  expect(screen.getByText(FIRST_AMOUNT)).toBeOnTheScreen();
  expect(balanceRequests()).toHaveLength(1);
}

let appState: AppStateCapture;

beforeEach(() => {
  appState = captureAppState();
});

afterEach(jest.restoreAllMocks);

describe('HomeScreen: refresco al volver del segundo plano', () => {
  it('al volver del segundo plano con cifra pide el saldo en silencio', async () => {
    const announce = spyOnAnnouncements();
    await loadHome();
    announce.mockClear();
    // La respuesta del refresco queda en espera hasta que el test la suelte.
    const refresh = holdNextResponse();

    await appState.emit('background');
    await appState.emit('active');

    expect(balanceRequests()).toHaveLength(2);
    expect(screen.queryByLabelText(LOADING)).not.toBeOnTheScreen();
    expect(screen.getByText(FIRST_AMOUNT)).toBeOnTheScreen();

    refresh.resolve(balanceResponse(2500));
    await settleRequests();

    expect(screen.getByText(NEW_AMOUNT)).toBeOnTheScreen();
    expect(balanceRequests()).toHaveLength(2);
    expect(announce).not.toHaveBeenCalled();
  });
});

describe('HomeScreen: vuelta del segundo plano fuera del Inicio', () => {
  it('si la app vuelve del segundo plano con otra pantalla delante no pide hasta volver al Inicio', async () => {
    await loadHome();
    await act(async () => router.push('/transferencias'));
    expect(screen).toHavePathname('/transferencias');
    mockApiRoutes({ balance: reply(200, balanceBody(2500, 'USD')), transferList: reply(200, transferListWrapped) });

    await appState.emit('background');
    await appState.emit('active');
    await settleRequests();

    expect(balanceRequests()).toHaveLength(1);

    await act(async () => router.back());
    expect(screen).toHavePathname('/');
    await settleRequests();

    expect(balanceRequests()).toHaveLength(2);
    expect(screen.getByText(NEW_AMOUNT)).toBeOnTheScreen();
  });
});

// Deja el aviso de la primera carga, todavía sin cifra, con Reintentar centrado.
async function failFirstLoad() {
  await renderHome({ balance: 'networkError' });
  await settleRequests();
  expect(screen.getByText(NETWORK)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Reintentar' }).parent).toHaveStyle({ alignSelf: 'center' });
  expect(balanceRequests()).toHaveLength(1);
}

const silentTriggers: [string, () => Promise<void>][] = [
  [
    'volver al Inicio',
    async () => {
      await act(async () => router.push('/transferencias'));
      await act(async () => router.back());
      expect(screen).toHavePathname('/');
    },
  ],
  [
    'volver del segundo plano',
    async () => {
      await appState.emit('background');
      await appState.emit('active');
    },
  ],
];

describe('HomeScreen: refresco en silencio con el aviso de primera carga', () => {
  it.each(silentTriggers)(
    'con el aviso de primera carga, volver o salir del segundo plano pide sin skeleton y con Reintentar ocupado (%s)',
    async (_case, trigger) => {
      await failFirstLoad();
      const refresh = holdNextResponse();

      await trigger();

      const retry = screen.getByRole('button', { name: 'Reintentando…' });
      expect(balanceRequests()).toHaveLength(2);
      expect(screen.getByText(NETWORK)).toBeOnTheScreen();
      expect(retry).toBeDisabled();
      expect(retry).toBeBusy();
      expect(screen.getByText('Reintentando…')).toBeOnTheScreen();
      expect(screen.queryByLabelText(LOADING)).not.toBeOnTheScreen();
      expect(screen.queryByRole('progressbar')).not.toBeOnTheScreen();

      refresh.resolve(balanceResponse(1800));
      await settleRequests();
    },
  );

  it.each(silentTriggers)('si responde bien la tarjeta sustituye al aviso (%s)', async (_case, trigger) => {
    await failFirstLoad();
    const refresh = holdNextResponse();

    await trigger();
    refresh.resolve(balanceResponse(1800));
    await settleRequests();

    expect(screen.queryByText(NETWORK)).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeOnTheScreen();
    expect(screen.getByText(FIRST_AMOUNT)).toBeOnTheScreen();
  });
});

const platformTriggers = (['ios', 'android'] as const).flatMap((os) =>
  silentTriggers.map(([name, trigger]) => [os, name, trigger] as const),
);

describe('HomeScreen: nuevo fallo del refresco en silencio sin cifra', () => {
  it.each(platformTriggers)(
    'si falla el aviso sigue, Reintentar se reactiva y se anuncia otra vez (%s, %s)',
    async (os, _case, trigger) => {
      const announce = spyOnAnnouncements(os);
      await failFirstLoad();
      announce.mockClear();
      mockApiRoutes({ balance: 'networkError', transferList: reply(200, transferListWrapped) });

      await trigger();
      await settleRequests();

      const retry = screen.getByRole('button', { name: 'Reintentar' });
      expect(balanceRequests()).toHaveLength(2);
      expect(screen.getByText(NETWORK)).toBeOnTheScreen();
      expect(retry).toBeEnabled();
      expect(retry).not.toBeBusy();
      expect(announce).toHaveBeenCalledTimes(1);
      expect(announce).toHaveBeenCalledWith(NETWORK);
    },
  );
});
