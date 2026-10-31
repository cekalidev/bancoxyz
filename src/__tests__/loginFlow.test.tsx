import { userEvent } from '@testing-library/react-native';
import { screen, testRouter } from 'expo-router/testing-library';
import { Alert } from 'react-native';

import { useSessionStore } from '@/features/auth/sessionStore';
import { ERROR_MESSAGES } from '@/services/api/errors';
import { balanceOk, loginOk, loginUnauthorized } from '@/test/apiFixtures';
import { mockApiRoutes, reply } from '@/test/fetchMock';
import {
  failWrites,
  holdNextWrite,
  secureStoreModule,
  storedValue,
} from '@/test/secureStoreMock';
import { prepareSessionTest, relaunchApp, renderApp } from '@/test/sessionHelpers';

jest.mock('expo-font', () => ({ useFonts: jest.fn(() => [true, null]) }));

const HOME_GREETING = `Hola, ${loginOk.user.name}`;
const LOGIN_TITLE = 'Hola de nuevo';
const EMAIL = 'gabriel@topaz.com';
const PASSWORD = 'clave-secreta-42';
const SESSION_KEY = 'bancoxyz.session';
const CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'debug'] as const;

function spyOnConsole() {
  return CONSOLE_METHODS.map((method) =>
    jest.spyOn(console, method).mockImplementation(() => undefined),
  );
}

async function loginFromApp(status = 200, body: unknown = loginOk) {
  mockApiRoutes({ login: reply(status, body), balance: reply(200, balanceOk) });
  await renderApp('/');
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Correo electrónico'), EMAIL);
  await user.type(screen.getByLabelText('Contraseña'), PASSWORD);
  await user.press(screen.getByRole('button', { name: 'Entrar' }));
}

function expectNoNotice() {
  Object.values(ERROR_MESSAGES).forEach((message) => {
    expect(screen.queryByText(message)).toBeNull();
  });
}

beforeEach(prepareSessionTest);
afterEach(jest.restoreAllMocks);

describe('login correcto', () => {
  it('tras un login correcto muestra el Inicio al instante aunque el guardado no haya terminado y atrás no vuelve al login', async () => {
    holdNextWrite();

    await loginFromApp();

    expect(await screen.findByText(HOME_GREETING)).toBeOnTheScreen();
    expect(screen).toHavePathname('/');
    expect(screen.queryByText(LOGIN_TITLE)).toBeNull();
    expect(testRouter.canGoBack()).toBe(false);
    expect(useSessionStore.getState().session).toEqual(loginOk);
    expect(secureStoreModule.setItemAsync).toHaveBeenCalledTimes(1);
    expect(storedValue()).toBeNull();
  });
});

const saveProblems: [string, () => void][] = [
  ['falla', failWrites],
  ['no termina', () => void holdNextWrite()],
];

describe('login correcto sin guardado', () => {
  it.each(saveProblems)(
    'si el guardado falla o no termina muestra el Inicio sin avisos y al reabrir pide login (%s)',
    async (_case, breakSave) => {
      const alert = jest.spyOn(Alert, 'alert');
      breakSave();

      await loginFromApp();

      expect(await screen.findByText(HOME_GREETING)).toBeOnTheScreen();
      expect(useSessionStore.getState().session).toEqual(loginOk);
      expect(alert).not.toHaveBeenCalled();
      expectNoNotice();

      await relaunchApp('/');

      expect(await screen.findByText(LOGIN_TITLE)).toBeOnTheScreen();
      expect(screen).toHavePathname('/login');
      expect(screen.queryByText(HOME_GREETING)).toBeNull();
    },
  );
});

const outcomes = [
  { outcome: 'correcto', status: 200, body: loginOk, visibleText: HOME_GREETING, saves: 1 },
  {
    outcome: 'fallido',
    status: 401,
    body: loginUnauthorized,
    visibleText: ERROR_MESSAGES.invalidCredentials,
    saves: 0,
  },
];

describe('datos sensibles del login', () => {
  it.each(outcomes)(
    'tras login correcto o fallido solo guarda token y usuario cifrados y nunca registra ni muestra contraseña ni token ($outcome)',
    async ({ status, body, visibleText, saves }) => {
      const consoleSpies = spyOnConsole();

      await loginFromApp(status, body);

      expect(await screen.findByText(visibleText)).toBeOnTheScreen();
      const writes = secureStoreModule.setItemAsync.mock.calls;
      expect(writes).toHaveLength(saves);
      writes.forEach(([key, value]) => {
        expect(key).toBe(SESSION_KEY);
        expect(JSON.parse(value)).toEqual(loginOk);
        expect(value).not.toContain(PASSWORD);
      });
      const logged = consoleSpies.flatMap((spy) => spy.mock.calls.flat().map(String));
      logged.forEach((entry) => {
        expect(entry).not.toContain(PASSWORD);
        expect(entry).not.toContain(loginOk.token);
      });
      expect(screen.queryByText(new RegExp(loginOk.token))).toBeNull();
      expect(screen.queryByText(new RegExp(PASSWORD))).toBeNull();
    },
  );
});
