import { act, fireEvent, screen } from 'expo-router/testing-library';
import { Alert, type AlertButton } from 'react-native';

import { getBalance } from '@/services/api/balance';
import { API_URLS } from '@/services/api/endpoints';
import { ERROR_MESSAGES } from '@/services/api/errors';
import {
  balanceOk,
  serverMessageBody,
  sessionUnauthorized,
  transferItem,
  transferListOf,
  transferListWrapped,
} from '@/test/apiFixtures';
import { mockFetchPendingEach, type PendingEachFetch } from '@/test/fetchPending';
import { prepareSessionTest, renderApp, seedSession } from '@/test/sessionHelpers';
import { LIST_NOW, listRequests, listSession, rowNames } from '@/test/transferListHelpers';
import { pressButton } from '@/test/transferSessionHelpers';

jest.mock('expo-font', () => ({ useFonts: jest.fn(() => [true, null]) }));
jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

type ApiRoute = keyof typeof API_URLS;

const GREETING = `Hola, ${listSession.user.name}`;
const EXPIRED = ERROR_MESSAGES.unauthorized;
const ALL_NAMES = ['Ronaldo de Assis Moreira', 'Lionel Andres Messi', 'Federico Valverde'];
// Respuesta de una petición antigua: con ella se ve si algo suyo llega a la pantalla.
const STALE_LIST = transferListOf([transferItem({ name: 'Persona Anterior', document: '99999999999', value: 777 })]);

let pending: PendingEachFetch;

// Índices, en el orden de envío, de las peticiones hechas a esa ruta.
function callsTo(route: ApiRoute) {
  return jest
    .mocked(global.fetch)
    .mock.calls.flatMap(([input], index) => (String(input) === API_URLS[route] ? [index] : []));
}

// Suelta la respuesta de la petición número `nth` a esa ruta (-1: la última) y deja terminar lo que provoca.
type StaleReply = { status: number; body: unknown };

async function answer(route: ApiRoute, nth: number, { status, body }: StaleReply) {
  const index = callsTo(route).at(nth);
  if (index === undefined) throw new Error(`No hay petición ${nth} a ${route}`);
  await act(async () => {
    pending.resolve(index, status, body);
    await Promise.allSettled([jest.mocked(global.fetch).mock.results[index]?.value]);
    await jest.advanceTimersByTimeAsync(0);
  });
}

async function openHome() {
  await renderApp('/');
  expect(await screen.findByRole('header', { name: GREETING })).toBeOnTheScreen();
  await answer('balance', -1, { status: 200, body: balanceOk });
}

// Abre el listado sin responder su petición: se queda en el skeleton.
async function openPendingList() {
  await pressButton('Ver transferencias');
  expect(screen).toHavePathname('/transferencias');
  expect(screen.getByLabelText('Cargando…')).toBeOnTheScreen();
}

async function backHome() {
  await pressButton('Volver');
  expect(screen).toHavePathname('/');
  await answer('balance', -1, { status: 200, body: balanceOk });
}

function expectPendingListUntouched() {
  expect(screen).toHavePathname('/transferencias');
  expect(screen.getByLabelText('Cargando…')).toBeOnTheScreen();
  expect(rowNames()).toEqual([]);
  Object.values(ERROR_MESSAGES).forEach((message) => expect(screen.queryByText(message)).toBeNull());
}

async function expectOwnResult() {
  await answer('transferList', -1, { status: 200, body: transferListWrapped });
  expect(screen.getByText('3 transferencias')).toBeOnTheScreen();
  expect(rowNames()).toEqual(ALL_NAMES);
}

async function logOut() {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  await pressButton('Cerrar sesión');
  const buttons: AlertButton[] = alert.mock.calls.at(-1)?.[2] ?? [];
  const exit = buttons.find((button) => button.text === 'Salir');
  if (!exit) throw new Error('El diálogo no tiene el botón Salir');
  await act(async () => exit.onPress?.());
}

async function signInAgain() {
  await fireEvent.changeText(await screen.findByLabelText('Correo electrónico'), listSession.user.email);
  await fireEvent.changeText(screen.getByLabelText('Contraseña'), 'clave-secreta-42');
  await pressButton('Entrar');
  await answer('login', -1, { status: 200, body: listSession });
  expect(await screen.findByRole('header', { name: GREETING })).toBeOnTheScreen();
  await answer('balance', -1, { status: 200, body: balanceOk });
}

// Formas de cerrar la sesión con la primera petición del listado aún en curso.
const sessionEnds: [string, () => Promise<void>][] = [
  [
    'Salir',
    async () => {
      await backHome();
      await logOut();
    },
  ],
  [
    '401 de otra petición',
    async () => {
      const other = getBalance().catch(() => undefined);
      await answer('balance', -1, { status: 401, body: sessionUnauthorized });
      await act(async () => {
        await other;
      });
      expect(await screen.findByText(EXPIRED)).toBeOnTheScreen();
    },
  ],
];

beforeEach(() => {
  prepareSessionTest();
  seedSession(listSession);
  jest.useFakeTimers().setSystemTime(LIST_NOW);
  pending = mockFetchPendingEach();
});
afterEach(jest.restoreAllMocks);

// Respuestas tardías de la primera petición: un listado con datos y un fallo del servidor.
const lateReplies: [string, StaleReply][] = [
  ['éxito', { status: 200, body: STALE_LIST }],
  ['error', { status: 500, body: serverMessageBody }],
];

describe('respuestas del listado que llegan tarde', () => {
  it.each(lateReplies)(
    'una respuesta que llega tras salir del listado no cambia nada, tampoco en uno abierto después',
    async (_kind, lateReply) => {
      await openHome();
      await openPendingList();
      await backHome();
      await openPendingList();

      await answer('transferList', 0, lateReply);

      expectPendingListUntouched();
      await expectOwnResult();
    },
  );
});

describe('respuestas del listado de una sesión anterior', () => {
  it.each(sessionEnds)(
    'una respuesta que llega tras cerrar la sesión no aparece en la sesión nueva',
    async (_end, endSession) => {
      await openHome();
      await openPendingList();
      await endSession();
      expect(screen).toHavePathname('/login');
      await signInAgain();
      await openPendingList();

      await answer('transferList', 0, { status: 200, body: STALE_LIST });

      expectPendingListUntouched();
      await expectOwnResult();
    },
  );
});

describe('respuestas del listado al volver a entrar', () => {
  it('al volver a entrar se envía una sola petición y se muestra su resultado', async () => {
    await openHome();
    await openPendingList();
    await backHome();
    await answer('transferList', 0, { status: 200, body: STALE_LIST });

    await openPendingList();

    expect(listRequests()).toHaveLength(2);
    expectPendingListUntouched();
    await expectOwnResult();
    expect(listRequests()).toHaveLength(2);
  });
});
