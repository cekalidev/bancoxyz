import { router } from 'expo-router';
import { act, screen } from 'expo-router/testing-library';

import { API_URLS } from '@/services/api/endpoints';
import { ERROR_MESSAGES } from '@/services/api/errors';

import { balanceOk, brokenListBodies, serverMessageBody, transferOk } from './apiFixtures';
import type { AppStateCapture } from './appStateMock';
import { mockApiRoutes, reply, type Reply } from './fetchMock';
import { deferFetch } from './fetchPending';
import { advancePastTimeout } from './timers';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// Cambia la respuesta de las siguientes peticiones del listado; el saldo y el envío siguen respondiendo bien.
export function answerListWith(list: Reply) {
  mockApiRoutes({ balance: reply(200, balanceOk), transferList: list, transfer: reply(200, transferOk) });
}

// Retiene las peticiones del listado hasta que el test suelte la respuesta; las demás URL siguen igual.
// Mientras no se suelte, no hay que llamar a `settleRequests`: esperaría a esta respuesta.
export function holdNextList() {
  const held = deferFetch();
  const previous = jest.mocked(global.fetch).getMockImplementation();
  jest.mocked(global.fetch).mockImplementation((input, init) => {
    if (String(input) === API_URLS.transferList) return held.promise;
    if (!previous) throw new Error(`fetch recibió una URL no prevista: ${String(input)}`);
    return previous(input, init);
  });
  return {
    resolve: (body: unknown) => held.resolve(new Response(JSON.stringify(body), { status: 200, headers: JSON_HEADERS })),
    fail: () => held.reject(new TypeError('Network request failed')),
  };
}

// Abre el formulario de nueva transferencia encima del listado y vuelve atrás.
export async function visitNewTransferAndBack() {
  await act(async () => router.push('/nueva-transferencia'));
  expect(screen).toHavePathname('/nueva-transferencia');
  await act(async () => router.back());
  expect(screen).toHavePathname('/transferencias');
}

// La app pasa a segundo plano y vuelve a estar activa.
export async function returnFromBackground(appState: AppStateCapture) {
  await appState.emit('background');
  await appState.emit('active');
}

// Deja pasar las respuestas ya resueltas y lo que provocan, sin esperar a las retenidas.
export async function flushResponses() {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(0);
  });
}

const NETWORK = ERROR_MESSAGES.network;
const UNKNOWN = ERROR_MESSAGES.unknown;

// Las tres transferencias reales del listado, en el orden en que se muestran.
export const REAL_NAMES = ['Ronaldo de Assis Moreira', 'Lionel Andres Messi', 'Federico Valverde'];

export type ListFailure = { cause: string; list: Reply; message: string };

// Causas de fallo del listado (salvo el 401) con el mensaje que se ve.
export const listFailures: ListFailure[] = [
  { cause: 'sin red', list: 'networkError', message: NETWORK },
  { cause: '15 s sin respuesta', list: 'pending', message: NETWORK },
  ...[400, 403, 404, 500, 503].map((status) => ({
    cause: String(status),
    list: reply(status, serverMessageBody),
    message: UNKNOWN,
  })),
  { cause: '200 que no es JSON', list: { raw: '<html>Error interno</html>', status: 200 }, message: UNKNOWN },
  ...Object.entries(brokenListBodies).map(([cause, body]) => ({ cause, list: reply(200, body), message: UNKNOWN })),
];

// Deja terminar la petición fallida; sin respuesta, espera los 15 s del tope.
export async function settleFailure(list: Reply) {
  await act(async () => {
    if (list === 'pending') await advancePastTimeout();
    else await jest.advanceTimersByTimeAsync(0);
  });
  await flushResponses();
}
