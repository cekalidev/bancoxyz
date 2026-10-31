import { act } from '@testing-library/react-native';
import { useFonts } from 'expo-font';
import { screen } from 'expo-router/testing-library';
import * as SplashScreen from 'expo-splash-screen';

import { LoginScreen } from '@/features/auth';
import { useSessionStore } from '@/features/auth/sessionStore';
import type { Session } from '@/services/api/types';
import { HomeStub, HOME_STUB_TITLE } from '@/test/HomeStub';
import { failNextRead, holdNextRead, seedStoredValue, storedValue } from '@/test/secureStoreMock';
import { prepareSessionTest, relaunchApp, renderApp, seedSession } from '@/test/sessionHelpers';

jest.mock('expo-font', () => ({ useFonts: jest.fn() }));

const LOGIN_TITLE = 'Hola de nuevo';
const CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'debug'] as const;

const session: Session = {
  token: 'token-de-prueba',
  user: { id: 7, name: 'Ana Prueba', email: 'ana@ejemplo.com' },
};

function prepareStartupTest() {
  prepareSessionTest();
  jest.mocked(SplashScreen.hide).mockClear();
  jest.mocked(useFonts).mockReturnValue([true, null]);
}

function countedLogin() {
  const mounts = { count: 0 };
  function CountedLogin() {
    mounts.count += 1;
    return <LoginScreen />;
  }
  return { mounts, CountedLogin };
}

beforeEach(prepareStartupTest);
afterEach(jest.restoreAllMocks);

describe('arranque con sesión guardada', () => {
  it('con sesión guardada mantiene el splash hasta leerla y abre el Inicio sin montar el login', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const { mounts, CountedLogin } = countedLogin();
    const releaseRead = holdNextRead();

    await renderApp('/', CountedLogin, HomeStub);

    expect(SplashScreen.hide).not.toHaveBeenCalled();
    expect(screen.queryByText(HOME_STUB_TITLE)).toBeNull();

    await act(async () => releaseRead(JSON.stringify(session)));

    expect(await screen.findByText(HOME_STUB_TITLE)).toBeOnTheScreen();
    expect(screen).toHavePathname('/');
    expect(SplashScreen.hide).toHaveBeenCalledTimes(1);
    expect(mounts.count).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('abre el Inicio aunque fallen las fuentes', async () => {
    jest.mocked(useFonts).mockReturnValue([false, new Error('Fallo simulado de fuentes')]);
    seedSession(session);

    await renderApp('/', LoginScreen, HomeStub);

    expect(await screen.findByText(HOME_STUB_TITLE)).toBeOnTheScreen();
    expect(SplashScreen.hide).toHaveBeenCalledTimes(1);
  });
});

describe('datos sensibles al arrancar', () => {
  it('no registra ni muestra el token al arrancar con sesión', async () => {
    const consoleSpies = CONSOLE_METHODS.map((method) =>
      jest.spyOn(console, method).mockImplementation(() => undefined),
    );
    seedSession(session);

    await renderApp('/', LoginScreen, HomeStub);

    expect(await screen.findByText(HOME_STUB_TITLE)).toBeOnTheScreen();
    expect(screen.queryByText(new RegExp(session.token))).toBeNull();
    const logged = consoleSpies.flatMap((spy) => spy.mock.calls.flat().map(String));
    logged.forEach((entry) => expect(entry).not.toContain(session.token));
  });
});

describe('arranque sin sesión guardada', () => {
  it('sin sesión guardada muestra el login tras el splash', async () => {
    const releaseRead = holdNextRead();

    await renderApp('/', LoginScreen, HomeStub);

    expect(SplashScreen.hide).not.toHaveBeenCalled();
    expect(screen.queryByText(LOGIN_TITLE)).toBeNull();

    await act(async () => releaseRead(null));

    expect(await screen.findByText(LOGIN_TITLE)).toBeOnTheScreen();
    expect(screen).toHavePathname('/login');
    expect(SplashScreen.hide).toHaveBeenCalledTimes(1);
  });
});

const damagedStarts: [string, () => void][] = [
  ['contenido que no se puede interpretar', () => seedStoredValue('{no es json')],
  ['token vacío', () => seedStoredValue(JSON.stringify({ ...session, token: '' }))],
  [
    'id como texto',
    () => seedStoredValue(JSON.stringify({ ...session, user: { ...session.user, id: '7' } })),
  ],
  [
    'lectura fallida',
    () => {
      seedSession(session);
      failNextRead();
    },
  ],
];

describe('arranque con sesión dañada', () => {
  it.each(damagedStarts)(
    'con la sesión dañada o la lectura fallida borra lo guardado y muestra el login (%s)',
    async (_case, prepareStorage) => {
      prepareStorage();

      await renderApp('/', LoginScreen, HomeStub);

      expect(await screen.findByText(LOGIN_TITLE)).toBeOnTheScreen();
      expect(screen).toHavePathname('/login');
      expect(screen.queryByText(HOME_STUB_TITLE)).toBeNull();
      expect(SplashScreen.hide).toHaveBeenCalledTimes(1);
      expect(storedValue()).toBeNull();
    },
  );
});

async function advance(ms: number) {
  await act(() => jest.advanceTimersByTimeAsync(ms));
}

describe('arranque con lectura lenta', () => {
  afterEach(() => jest.useRealTimers());

  it('si la lectura tarda más de 3 segundos muestra el login, ignora el resultado tardío y no borra lo guardado', async () => {
    jest.useFakeTimers();
    seedSession(session);
    const releaseRead = holdNextRead();
    await renderApp('/', LoginScreen, HomeStub);

    await advance(2999);
    expect(SplashScreen.hide).not.toHaveBeenCalled();
    expect(screen.queryByText(LOGIN_TITLE)).toBeNull();

    await advance(1);
    expect(screen.getByText(LOGIN_TITLE)).toBeOnTheScreen();
    expect(screen).toHavePathname('/login');
    expect(SplashScreen.hide).toHaveBeenCalledTimes(1);

    await act(async () => releaseRead(JSON.stringify(session)));
    await advance(0);
    expect(screen.getByText(LOGIN_TITLE)).toBeOnTheScreen();
    expect(screen.queryByText(HOME_STUB_TITLE)).toBeNull();
    expect(useSessionStore.getState().session).toBeNull();
    expect(storedValue()).toBe(JSON.stringify(session));

    jest.useRealTimers();
    await relaunchApp('/', HomeStub);
    expect(await screen.findByText(HOME_STUB_TITLE)).toBeOnTheScreen();
  });
});
