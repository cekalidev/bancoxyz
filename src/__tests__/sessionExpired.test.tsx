import { act, userEvent, waitFor, within } from '@testing-library/react-native';
import { screen, testRouter } from 'expo-router/testing-library';
import { AccessibilityInfo, Platform } from 'react-native';

import { useSessionStore } from '@/features/auth/sessionStore';
import { getBalance } from '@/services/api/balance';
import { ERROR_MESSAGES } from '@/services/api/errors';
import type { Session } from '@/services/api/types';
import { balanceOk, loginOk, sessionUnauthorized } from '@/test/apiFixtures';
import { mockApiRoutes, mockFetchPendingEach, mockFetchResponse, reply } from '@/test/fetchMock';
import { failDeletes, secureStoreModule, storedValue } from '@/test/secureStoreMock';
import { prepareAppTest, relaunchApp, renderApp, seedSession } from '@/test/sessionHelpers';

jest.mock('expo-font', () => ({ useFonts: jest.fn(() => [true, null]) }));

const HOME_GREETING = 'Hola, Ana Prueba';
const NEW_SESSION_GREETING = `Hola, ${loginOk.user.name}`;
const BALANCE_TEXT = 'US$\u00a01.800,00';
const NOTICE = ERROR_MESSAGES.unauthorized;
const EMAIL = 'Correo electrónico';
const PASSWORD = 'Contraseña';

const session: Session = {
  token: 'token-de-prueba',
  user: { id: 7, name: 'Ana Prueba', email: 'ana@ejemplo.com' },
};

async function openHomeWithSession() {
  seedSession(session);
  await renderApp('/');
  expect(await screen.findByText(HOME_GREETING)).toBeOnTheScreen();
  // El saldo del Inicio ya llegó: su petición no ocupa índices en los pendientes posteriores.
  expect(await screen.findByText(BALANCE_TEXT)).toBeOnTheScreen();
}

async function answerRequestsWith401() {
  mockFetchResponse(401, sessionUnauthorized);
  await act(async () => {
    await getBalance().catch(() => undefined);
  });
}

// All requests are in flight together; each 401 then arrives in its own render pass.
async function answerConcurrentRequestsWith401(count: number) {
  const pending = mockFetchPendingEach();
  const requests = Array.from({ length: count }, () => getBalance().catch(() => undefined));
  for (const index of requests.keys()) {
    await act(async () => {
      pending.resolve(index, 401, sessionUnauthorized);
      await requests[index];
    });
  }
}

function spyOnAnnouncements() {
  jest.replaceProperty(Platform, 'OS', 'ios');
  return jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockClear();
}

function politeRegionWith(message: string) {
  return screen.container
    .queryAll((node) => node.props.accessibilityLiveRegion === 'polite')
    .find((region) => within(region).queryByText(message) !== null);
}

async function signInAgain() {
  mockApiRoutes({ login: reply(200, loginOk), balance: reply(200, balanceOk) });
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(PASSWORD), 'clave-secreta-42');
  await user.press(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByText(NEW_SESSION_GREETING)).toBeOnTheScreen();
}

beforeEach(prepareAppTest);
afterEach(jest.restoreAllMocks);

describe('sesión caducada por un 401', () => {
  it('un 401 en una petición autenticada lleva al login con el aviso, el correo prerrellenado y la contraseña vacía, sin volver atrás', async () => {
    await openHomeWithSession();

    await answerRequestsWith401();

    expect(await screen.findByText(NOTICE)).toBeOnTheScreen();
    expect(politeRegionWith(NOTICE)).toBeDefined();
    expect(screen).toHavePathname('/login');
    expect(screen.queryByText(HOME_GREETING)).toBeNull();
    expect(screen.getByLabelText(EMAIL)).toHaveDisplayValue(session.user.email);
    expect(screen.getByLabelText(PASSWORD)).toHaveDisplayValue('');
    expect(testRouter.canGoBack()).toBe(false);
    expect(useSessionStore.getState().session).toBeNull();
    await waitFor(() => expect(storedValue()).toBeNull());
  });
});

describe('aviso único de sesión caducada', () => {
  it('varios 401 a la vez muestran el aviso una sola vez', async () => {
    const announce = spyOnAnnouncements();
    await openHomeWithSession();

    await answerConcurrentRequestsWith401(3);

    expect(await screen.findAllByText(NOTICE)).toHaveLength(1);
    expect(announce.mock.calls.filter(([message]) => message === NOTICE)).toHaveLength(1);
  });

  it('tras volver a entrar un 401 posterior muestra el aviso otra vez', async () => {
    const announce = spyOnAnnouncements();
    await openHomeWithSession();
    await answerRequestsWith401();
    expect(await screen.findByText(NOTICE)).toBeOnTheScreen();

    await signInAgain();
    expect(screen.queryByText(NOTICE)).toBeNull();
    await answerRequestsWith401();

    expect(await screen.findByText(NOTICE)).toBeOnTheScreen();
    expect(screen).toHavePathname('/login');
    expect(screen.getByLabelText(EMAIL)).toHaveDisplayValue(loginOk.user.email);
    expect(announce.mock.calls.filter(([message]) => message === NOTICE)).toHaveLength(2);
  });
});

describe('reabrir tras una sesión caducada', () => {
  it('tras una sesión caducada al reabrir la app el login aparece vacío y sin aviso', async () => {
    await openHomeWithSession();
    await answerRequestsWith401();
    expect(await screen.findByText(NOTICE)).toBeOnTheScreen();
    await waitFor(() => expect(storedValue()).toBeNull());

    await relaunchApp('/');

    expect(await screen.findByLabelText(EMAIL)).toHaveDisplayValue('');
    expect(screen.getByLabelText(PASSWORD)).toHaveDisplayValue('');
    expect(screen.queryByText(NOTICE)).toBeNull();
    const writes = secureStoreModule.setItemAsync.mock.calls.map(([, value]) => value);
    writes.forEach((value) => expect(value).not.toContain(session.user.email));
  });
});

describe('peticiones de una sesión anterior', () => {
  it('un 401 de una petición anterior a un nuevo login no cierra la sesión vigente', async () => {
    await openHomeWithSession();
    const pending = mockFetchPendingEach();
    const earlier = getBalance().catch(() => undefined);
    const expiring = getBalance().catch(() => undefined);
    await act(async () => {
      pending.resolve(1, 401, sessionUnauthorized);
      await expiring;
    });
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(PASSWORD), 'clave-secreta-42');
    await user.press(screen.getByRole('button', { name: 'Entrar' }));
    // El índice 3 es la petición del saldo del Inicio de la sesión nueva y queda sin resolver.
    await act(async () => pending.resolve(2, 200, loginOk));
    expect(await screen.findByText(NEW_SESSION_GREETING)).toBeOnTheScreen();

    await act(async () => {
      pending.resolve(0, 401, sessionUnauthorized);
      await earlier;
    });

    expect(screen.getByText(NEW_SESSION_GREETING)).toBeOnTheScreen();
    expect(screen).toHavePathname('/');
    expect(screen.queryByText(NOTICE)).toBeNull();
    expect(useSessionStore.getState()).toEqual({ session: loginOk, expiredEmail: null });
  });
});

const CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'debug'] as const;

describe('datos sensibles y borrado al caducar', () => {
  it('no registra ni muestra el token al cerrar por sesión caducada', async () => {
    const consoleSpies = CONSOLE_METHODS.map((method) =>
      jest.spyOn(console, method).mockImplementation(() => undefined),
    );
    await openHomeWithSession();

    await answerRequestsWith401();

    expect(await screen.findByText(NOTICE)).toBeOnTheScreen();
    expect(screen.queryByText(new RegExp(session.token))).toBeNull();
    const logged = consoleSpies.flatMap((spy) => spy.mock.calls.flat().map(String));
    logged.forEach((entry) => expect(entry).not.toContain(session.token));
  });

  it('si falla el borrado tras un 401 muestra el login con el aviso y al reabrir no restaura la sesión', async () => {
    failDeletes();
    await openHomeWithSession();

    await answerRequestsWith401();

    expect(await screen.findByText(NOTICE)).toBeOnTheScreen();
    expect(screen).toHavePathname('/login');
    expect(screen.getAllByText(NOTICE)).toHaveLength(1);
    expect(screen.queryByText(ERROR_MESSAGES.unknown)).toBeNull();
    await waitFor(() => expect(storedValue() ?? '').not.toContain(session.token));

    await relaunchApp('/');

    expect(await screen.findByLabelText(EMAIL)).toHaveDisplayValue('');
    expect(screen).toHavePathname('/login');
    expect(screen.queryByText(HOME_GREETING)).toBeNull();
  });
});
