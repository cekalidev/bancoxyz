import { useFonts } from 'expo-font';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import * as SplashScreen from 'expo-splash-screen';

import type { Session } from '@/services/api/types';
import { balanceOk, sessionUnauthorized } from '@/test/apiFixtures';
import { HomeStub, HOME_STUB_TITLE } from '@/test/HomeStub';
import { lastFetchCall, mockFetchResponse } from '@/test/fetchMock';
import { holdNextRead } from '@/test/secureStoreMock';
import { prepareSessionTest, seedSession } from '@/test/sessionHelpers';

import { RootLayout } from './RootLayout';

jest.mock('expo-font', () => ({ useFonts: jest.fn() }));

const session: Session = {
  token: 'token-de-prueba',
  user: { id: 7, name: 'Ana Prueba', email: 'ana@ejemplo.com' },
};

const preventCallsAtImport = jest.mocked(SplashScreen.preventAutoHideAsync).mock.calls.length;

function renderApp() {
  return renderRouter({ _layout: RootLayout, index: HomeStub }, { initialUrl: '/' });
}

function prepareLayoutTest() {
  jest.clearAllMocks();
  prepareSessionTest();
}

describe('RootLayout: splash y fuentes', () => {
  beforeEach(prepareLayoutTest);

  it('mantiene el splash mientras las fuentes cargan', async () => {
    seedSession(session);
    jest.mocked(useFonts).mockReturnValue([false, null]);

    await renderApp();

    expect(preventCallsAtImport).toBeGreaterThan(0);
    expect(SplashScreen.hide).not.toHaveBeenCalled();
    expect(screen.queryByText(HOME_STUB_TITLE)).toBeNull();
  });

  it('oculta el splash y muestra el inicio cuando las fuentes cargan', async () => {
    seedSession(session);
    jest.mocked(useFonts).mockReturnValue([true, null]);

    await renderApp();

    expect(await screen.findByText(HOME_STUB_TITLE)).toBeOnTheScreen();
    expect(SplashScreen.hide).toHaveBeenCalledTimes(1);
  });

  it('oculta el splash y muestra el inicio aunque las fuentes fallen', async () => {
    seedSession(session);
    jest.mocked(useFonts).mockReturnValue([false, new Error('x')]);

    await renderApp();

    expect(await screen.findByText(HOME_STUB_TITLE)).toBeOnTheScreen();
    expect(SplashScreen.hide).toHaveBeenCalledTimes(1);
  });
});

describe('RootLayout: splash y lectura de la sesión', () => {
  beforeEach(prepareLayoutTest);

  it('mantiene el splash hasta que terminan las fuentes y la lectura de la sesión', async () => {
    jest.mocked(useFonts).mockReturnValue([true, null]);
    const releaseRead = holdNextRead();

    await renderApp();

    expect(SplashScreen.hide).not.toHaveBeenCalled();
    expect(screen.queryByText(HOME_STUB_TITLE)).toBeNull();

    await act(async () => releaseRead(JSON.stringify(session)));

    expect(await screen.findByText(HOME_STUB_TITLE)).toBeOnTheScreen();
    expect(SplashScreen.hide).toHaveBeenCalledTimes(1);
  });
});

type IsolatedApp = {
  store: typeof import('@/features/auth/sessionStore');
  balance: typeof import('@/services/api/balance');
};

function loadAppInFreshRegistry(): IsolatedApp {
  let app: IsolatedApp | null = null;
  jest.isolateModules(() => {
    jest.requireActual('./RootLayout');
    app = {
      store: jest.requireActual<IsolatedApp['store']>('@/features/auth/sessionStore'),
      balance: jest.requireActual<IsolatedApp['balance']>('@/services/api/balance'),
    };
  });
  if (!app) throw new Error('no se cargó la app');
  return app;
}

describe('RootLayout: conexión de la API con la sesión', () => {
  afterEach(jest.restoreAllMocks);

  it('conecta el cliente de la API con la sesión al cargar la app', async () => {
    const { store, balance } = loadAppInFreshRegistry();
    store.useSessionStore.setState({ session });

    mockFetchResponse(200, balanceOk);
    await balance.getBalance();
    expect(lastFetchCall().headers.Authorization).toBe(`Bearer ${session.token}`);

    mockFetchResponse(401, sessionUnauthorized);
    await expect(balance.getBalance()).rejects.toMatchObject({ kind: 'unauthorized' });
    expect(store.useSessionStore.getState()).toEqual({
      session: null,
      expiredEmail: session.user.email,
    });
  });
});
