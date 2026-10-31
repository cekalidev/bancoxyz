import { balanceOk } from '@/test/apiFixtures';
import {
  mockFetchNetworkError,
  mockFetchPending,
  mockFetchPendingIgnoringAbort,
  mockFetchRawBody,
  mockFetchResponse,
} from '@/test/fetchMock';

import { getBalance } from './balance';
import { configureApi } from './client';
import { ApiError, ERROR_MESSAGES } from './errors';
import { login } from './login';
import { createTransfer } from './transfer';
import { getTransfers } from './transfers';
import type { NewTransfer } from './types';

const newTransfer: NewTransfer = {
  amount: 100.5,
  currency: 'USD',
  payeeDocument: '12345678900',
  date: { year: 2026, month: 3, day: 7 },
};

const endpoints: [string, () => Promise<unknown>][] = [
  ['login', () => login('ana@example.com', 'secreta')],
  ['getBalance', () => getBalance()],
  ['getTransfers', () => getTransfers()],
  ['createTransfer', () => createTransfer(newTransfer)],
];

function sentSignal(): AbortSignal | null | undefined {
  return jest.mocked(global.fetch).mock.calls[0][1]?.signal;
}

beforeEach(() => configureApi({ getToken: () => 'token', onUnauthorized: jest.fn() }));

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('respuestas de error de la API', () => {
  it('convierte un 400 en datos inválidos sin mostrar el texto del servidor en los cuatro endpoints', async () => {
    for (const [, call] of endpoints) {
      mockFetchResponse(400, { message: 'Bad Request' });
      const error = await call().catch((reason: unknown) => reason);
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ kind: 'badRequest', message: ERROR_MESSAGES.badRequest });
      expect((error as ApiError).message).not.toContain('Bad Request');
    }
    expect(ERROR_MESSAGES.badRequest).toBe('Revisa los datos e inténtalo de nuevo.');
  });

  it('convierte 403 y 500 en error desconocido', async () => {
    for (const status of [403, 500]) {
      mockFetchResponse(status, { message: 'Forbidden' });
      await expect(getBalance()).rejects.toMatchObject({
        kind: 'unknown',
        message: ERROR_MESSAGES.unknown,
      });
    }
    expect(ERROR_MESSAGES.unknown).toBe('Algo salió mal. Inténtalo de nuevo.');
  });

  it('da error desconocido si el cuerpo no es JSON', async () => {
    mockFetchRawBody(200, '<html>');

    await expect(getBalance()).rejects.toMatchObject({
      kind: 'unknown',
      message: ERROR_MESSAGES.unknown,
    });
  });
});

describe('fallos de red', () => {
  it('da error de red sin conexión', async () => {
    mockFetchNetworkError();

    await expect(getBalance()).rejects.toMatchObject({
      kind: 'network',
      message: ERROR_MESSAGES.network,
    });
    expect(ERROR_MESSAGES.network).toBe('No hay conexión. Revisa tu internet e inténtalo de nuevo.');
  });

  it('no reintenta', async () => {
    const offline = mockFetchNetworkError();
    await expect(getBalance()).rejects.toMatchObject({ kind: 'network' });
    expect(offline).toHaveBeenCalledTimes(1);

    jest.restoreAllMocks();
    const failing = mockFetchResponse(500, { message: 'Internal Server Error' });
    await expect(getBalance()).rejects.toMatchObject({ kind: 'unknown' });
    expect(failing).toHaveBeenCalledTimes(1);
  });
});

describe('tiempo máximo de respuesta', () => {
  it('da error de red a los 15 segundos sin respuesta', async () => {
    jest.useFakeTimers();
    mockFetchPending();
    const pending = getBalance();
    const settled = jest.fn();
    pending.then(settled, settled);
    const assertion = expect(pending).rejects.toMatchObject({ kind: 'network' });

    await jest.advanceTimersByTimeAsync(14999);
    expect(settled).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    expect(settled).toHaveBeenCalledTimes(1);
    await assertion;
    expect(sentSignal()?.aborted).toBe(true);
  });

  it('una transferencia que responde tarde no cuenta como éxito', async () => {
    jest.useFakeTimers();
    const server = mockFetchPendingIgnoringAbort();
    const outcome = Promise.allSettled([createTransfer(newTransfer)]);
    const onSettled = jest.fn();
    void outcome.then(onSettled);

    await jest.advanceTimersByTimeAsync(15000);
    expect(onSettled).toHaveBeenCalledTimes(1);

    server.resolve(200, { status: 'success' });
    await jest.advanceTimersByTimeAsync(0);
    const [result] = await outcome;
    expect(result.status).toBe('rejected');
    expect(result).toMatchObject({ reason: { kind: 'network' } });
  });
});

describe('limpieza del temporizador de la petición', () => {
  it('no deja temporizadores pendientes al terminar', async () => {
    jest.useFakeTimers();

    mockFetchResponse(200, balanceOk);
    await getBalance();
    expect(jest.getTimerCount()).toBe(0);

    mockFetchNetworkError();
    await expect(getBalance()).rejects.toMatchObject({ kind: 'network' });
    expect(jest.getTimerCount()).toBe(0);
  });
});
