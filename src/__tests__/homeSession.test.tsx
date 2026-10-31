import { userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { act, screen } from 'expo-router/testing-library';
import { Alert, type AlertButton } from 'react-native';

import { ERROR_MESSAGES } from '@/services/api/errors';
import { balanceOk, loginOk, sessionUnauthorized } from '@/test/apiFixtures';
import { mockApiRoutes, reply } from '@/test/fetchMock';
import { balanceRequests, settleRequests, spyOnAnnouncements } from '@/test/homeHelpers';
import { secureStoreModule, storedValue } from '@/test/secureStoreMock';
import { prepareAppTest, relaunchApp, renderApp, seedSession } from '@/test/sessionHelpers';

jest.mock('expo-font', () => ({ useFonts: jest.fn(() => [true, null]) }));

const NBSP = ' ';
const AMOUNT = `US$${NBSP}1.800,00`;
const GREETING = `Hola, ${loginOk.user.name}`;
const LOGIN_TITLE = 'Hola de nuevo';
const SESSION_KEY = 'bancoxyz.session';
const HIDE = 'Ocultar saldo';
const SHOW = 'Mostrar saldo';
const EXPIRED = ERROR_MESSAGES.unauthorized;
const HOME_NOTICES = [ERROR_MESSAGES.network, ERROR_MESSAGES.unknown];
const EXPIRED_REPLY = reply(401, sessionUnauthorized);

function spyOnAlert() {
  return jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
}

async function chooseInDialog(alert: ReturnType<typeof spyOnAlert>, text: string) {
  const buttons: AlertButton[] = alert.mock.calls.at(-1)?.[2] ?? [];
  const button = buttons.find((candidate) => candidate.text === text);
  if (!button) throw new Error(`El diálogo no tiene el botón ${text}`);
  await act(async () => button.onPress?.());
}

// Espera al saludo y a que terminen las peticiones del Inicio recién abierto.
async function waitForHome() {
  expect(await screen.findByRole('header', { name: GREETING })).toBeOnTheScreen();
  await settleRequests();
}

async function loginWithCredentials() {
  expect(await screen.findByText(LOGIN_TITLE)).toBeOnTheScreen();
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Correo electrónico'), loginOk.user.email);
  await user.type(screen.getByLabelText('Contraseña'), 'clave-secreta-42');
  await user.press(screen.getByRole('button', { name: 'Entrar' }));
  await waitForHome();
}

async function openHomeWithSession() {
  seedSession(loginOk);
  await renderApp('/');
  await waitForHome();
}

async function logoutAndLoginAgain() {
  const alert = spyOnAlert();
  await userEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' }));
  await chooseInDialog(alert, 'Salir');
  await loginWithCredentials();
}

async function hideBalance() {
  await userEvent.press(screen.getByRole('button', { name: HIDE }));
  expect(screen.getByRole('button', { name: SHOW })).toBeOnTheScreen();
  expect(screen.queryByText(AMOUNT)).toBeNull();
}

function expectVisibleBalance() {
  expect(screen.getByText(AMOUNT)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: HIDE })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: SHOW })).toBeNull();
}

// Claves con valor guardado en el almacenamiento seguro simulado.
function storedKeys() {
  const written = secureStoreModule.setItemAsync.mock.calls.map(([key]) => key);
  return [...new Set(written)].filter((key) => storedValue(key) !== null).sort();
}

// Abre el Inicio con sesión y el saldo respondiendo 401 desde la primera carga.
async function expireOnFirstLoad() {
  mockApiRoutes({ login: reply(200, loginOk), balance: EXPIRED_REPLY });
  seedSession(loginOk);
  await renderApp('/');
}

// Carga la cifra, sale al listado y, al volver, el refresco del saldo responde 401.
async function expireOnRefresh() {
  await openHomeWithSession();
  expectVisibleBalance();
  await act(async () => router.push('/transferencias'));
  expect(screen).toHavePathname('/transferencias');
  mockApiRoutes({ login: reply(200, loginOk), balance: EXPIRED_REPLY });
  await act(async () => router.back());
}

const expiryMoments: [string, () => Promise<void>][] = [
  ['en la primera carga', expireOnFirstLoad],
  ['en un refresco con cifra', expireOnRefresh],
];

// Prepara la entrada al Inicio y devuelve las peticiones de saldo previas a esa entrada.
const entryPaths: [string, () => Promise<number>][] = [
  [
    'tras el login',
    async () => {
      await renderApp('/login');
      await loginWithCredentials();
      return 0;
    },
  ],
  [
    'al abrir con sesión',
    async () => {
      await openHomeWithSession();
      return 0;
    },
  ],
  [
    'tras volver a entrar',
    async () => {
      await openHomeWithSession();
      const before = balanceRequests().length;
      await logoutAndLoginAgain();
      return before;
    },
  ],
];

beforeEach(() => {
  prepareAppTest();
  mockApiRoutes({ login: reply(200, loginOk), balance: reply(200, balanceOk) });
});
afterEach(jest.restoreAllMocks);

describe('Inicio en el ciclo de la sesión', () => {
  it.each(entryPaths)(
    'tras el login, al abrir con sesión y tras volver a entrar se pide el saldo una sola vez (%s)',
    async (_path, enterHome) => {
      const before = await enterHome();

      expect(balanceRequests().length - before).toBe(1);
      expectVisibleBalance();
    },
  );
});

describe('el estado del ojo no sobrevive a la sesión', () => {
  it('tras ocultar el saldo, al reabrir la app aparece visible', async () => {
    await openHomeWithSession();
    await hideBalance();

    await relaunchApp('/');
    await waitForHome();

    expectVisibleBalance();
  });

  it('tras ocultar el saldo, salir y volver a entrar aparece visible', async () => {
    await openHomeWithSession();
    await hideBalance();

    await logoutAndLoginAgain();

    expectVisibleBalance();
  });

  it('no guarda el estado del ojo en el almacenamiento', async () => {
    await renderApp('/login');
    await loginWithCredentials();
    const keysBefore = storedKeys();

    await hideBalance();
    await settleRequests();
    await userEvent.press(screen.getByRole('button', { name: SHOW }));
    await settleRequests();

    expect(keysBefore).toEqual([SESSION_KEY]);
    expect(storedKeys()).toEqual(keysBefore);
    expect(secureStoreModule.setItemAsync.mock.calls.map(([key]) => key)).toEqual([SESSION_KEY]);
    expect(storedValue()).not.toMatch(/hidden|oculto|visible/i);
  });
});

describe('sesión caducada desde el Inicio', () => {
  it.each(expiryMoments)(
    'un 401 del saldo lleva al login con el aviso de sesión caducada y sin aviso del Inicio (%s)',
    async (_moment, expire) => {
      const announce = spyOnAnnouncements('ios');

      await expire();

      expect(await screen.findByText(EXPIRED)).toBeOnTheScreen();
      await settleRequests();
      expect(screen).toHavePathname('/login');
      expect(screen.queryByRole('header', { name: GREETING })).toBeNull();
      expect(screen.getAllByText(EXPIRED)).toHaveLength(1);
      HOME_NOTICES.forEach((notice) => expect(screen.queryByText(notice)).toBeNull());
      expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
      const announced = announce.mock.calls.map(([message]) => message);
      HOME_NOTICES.forEach((notice) => expect(announced).not.toContain(notice));
      expect(announced.filter((message) => message === EXPIRED)).toHaveLength(1);
    },
  );
});
