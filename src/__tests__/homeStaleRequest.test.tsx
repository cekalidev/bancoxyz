import { userEvent } from '@testing-library/react-native';
import { act, screen } from 'expo-router/testing-library';
import { Alert, type AlertButton } from 'react-native';

import { useSessionStore } from '@/features/auth/sessionStore';
import { ERROR_MESSAGES } from '@/services/api/errors';
import { getTransfers } from '@/services/api/transfers';
import type { Session } from '@/services/api/types';
import { balanceBody, loginOk, sessionUnauthorized } from '@/test/apiFixtures';
import { mockFetchPendingEach, type PendingEachFetch } from '@/test/fetchPending';
import { balanceRequests, spyOnAnnouncements } from '@/test/homeHelpers';
import { prepareAppTest, renderApp, seedSession } from '@/test/sessionHelpers';

jest.mock('expo-font', () => ({ useFonts: jest.fn(() => [true, null]) }));

const NBSP = ' ';
const NEW_AMOUNT = `US$${NBSP}1.800,00`;
const STALE_AMOUNT = `US$${NBSP}9.999,00`;
const OLD_GREETING = 'Hola, Ana Prueba';
const NEW_GREETING = `Hola, ${loginOk.user.name}`;
const LOGIN_TITLE = 'Hola de nuevo';
const EXPIRED = ERROR_MESSAGES.unauthorized;
const HOME_NOTICES = [ERROR_MESSAGES.network, ERROR_MESSAGES.unknown];

// Índices de las llamadas a la red en el orden en que la app las envía.
const OLD_BALANCE = 0;
const LOGIN = 1;
const NEW_BALANCE = 2;
const OTHER_REQUEST = 1;

const oldSession: Session = {
  token: 'token-de-la-sesion-anterior',
  user: { id: 7, name: 'Ana Prueba', email: 'ana@ejemplo.com' },
};

type StaleReply = { status: number; body: unknown };

const staleReplies: [string, StaleReply][] = [
  ['éxito con otra cifra', { status: 200, body: balanceBody(9999, 'USD') }],
  ['error 500', { status: 500, body: { message: 'Internal Server Error' } }],
  ['sesión caducada 401', { status: 401, body: sessionUnauthorized }],
];

const platforms = ['ios', 'android'] as const;

// En Android el aviso de sesión caducada lo lee su región viva; en iOS se anuncia a mano una vez.
const EXPIRED_ANNOUNCEMENTS = { ios: 1, android: 0 };

async function openHomeWithPendingBalance() {
  const pending = mockFetchPendingEach();
  seedSession(oldSession);
  await renderApp('/');
  expect(await screen.findByRole('header', { name: OLD_GREETING })).toBeOnTheScreen();
  expect(balanceRequests()).toHaveLength(1);
  return pending;
}

async function logout() {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  await userEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' }));
  const buttons: AlertButton[] = alert.mock.calls.at(-1)?.[2] ?? [];
  const leave = buttons.find((button) => button.text === 'Salir');
  if (!leave) throw new Error('El diálogo no tiene el botón Salir');
  await act(async () => leave.onPress?.());
}

async function loginAgain(pending: PendingEachFetch) {
  expect(await screen.findByText(LOGIN_TITLE)).toBeOnTheScreen();
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Correo electrónico'), loginOk.user.email);
  await user.type(screen.getByLabelText('Contraseña'), 'clave-secreta-42');
  await user.press(screen.getByRole('button', { name: 'Entrar' }));
  await act(async () => pending.resolve(LOGIN, 200, loginOk));
  expect(await screen.findByRole('header', { name: NEW_GREETING })).toBeOnTheScreen();
}

// Suelta una sola respuesta y espera a que termine lo que provoca; las demás siguen pendientes.
async function resolveAndSettle(pending: PendingEachFetch, index: number, { status, body }: StaleReply) {
  await act(async () => {
    pending.resolve(index, status, body);
    await jest.mocked(global.fetch).mock.results[index]?.value;
    await jest.advanceTimersByTimeAsync(0);
  });
}

function expectNoBalanceErrors(announce: ReturnType<typeof spyOnAnnouncements>) {
  HOME_NOTICES.forEach((notice) => expect(screen.queryByText(notice)).toBeNull());
  expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
  const announced = announce.mock.calls.map(([message]) => message);
  HOME_NOTICES.forEach((notice) => expect(announced).not.toContain(notice));
}

beforeEach(prepareAppTest);
afterEach(jest.restoreAllMocks);

describe.each(platforms)('respuesta de una sesión anterior en %s', (os) => {
  it.each(staleReplies)(
    'tras salir y volver a entrar, la respuesta de la petición antigua se descarta y la nueva carga sigue su ciclo (%s)',
    async (_case, staleReply) => {
      const pending = await openHomeWithPendingBalance();
      await logout();
      await loginAgain(pending);
      // La plataforma cambia tras pulsar: en Android las pulsaciones piden al nativo el efecto de onda.
      const announce = spyOnAnnouncements(os);
      // La sesión nueva envía su propia petición del saldo.
      expect(balanceRequests()).toHaveLength(2);

      await resolveAndSettle(pending, OLD_BALANCE, staleReply);

      expect(screen.getByRole('header', { name: NEW_GREETING })).toBeOnTheScreen();
      expect(screen).toHavePathname('/');
      expect(screen.queryByText(STALE_AMOUNT)).toBeNull();
      expect(screen.queryByText(EXPIRED)).toBeNull();
      expect(useSessionStore.getState().session).toEqual(loginOk);
      expectNoBalanceErrors(announce);

      await resolveAndSettle(pending, NEW_BALANCE, { status: 200, body: balanceBody(1800, 'USD') });

      expect(await screen.findByText(NEW_AMOUNT)).toBeOnTheScreen();
      expect(screen.queryByText(STALE_AMOUNT)).toBeNull();
      expectNoBalanceErrors(announce);
    },
  );
});

describe.each(platforms)('sesión cerrada por otra petición en %s', (os) => {
  it.each(staleReplies)(
    'si un 401 de otra petición cierra la sesión, la respuesta pendiente del saldo no muestra nada (%s)',
    async (_case, staleReply) => {
      const announce = spyOnAnnouncements(os);
      const pending = await openHomeWithPendingBalance();
      const other = getTransfers().catch(() => undefined);
      await act(async () => {
        pending.resolve(OTHER_REQUEST, 401, sessionUnauthorized);
        await other;
      });
      expect(await screen.findByText(EXPIRED)).toBeOnTheScreen();

      await resolveAndSettle(pending, OLD_BALANCE, staleReply);

      expect(screen).toHavePathname('/login');
      expect(screen.queryByRole('header', { name: OLD_GREETING })).toBeNull();
      expect(screen.queryByText(STALE_AMOUNT)).toBeNull();
      expect(screen.getAllByText(EXPIRED)).toHaveLength(1);
      expectNoBalanceErrors(announce);
      expect(announce.mock.calls.filter(([message]) => message === EXPIRED)).toHaveLength(EXPIRED_ANNOUNCEMENTS[os]);
    },
  );
});
