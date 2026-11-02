import { getBalance } from '@/services/api/balance';
import { ApiError } from '@/services/api/errors';
import { getTransfers } from '@/services/api/transfers';

import { balanceOk, transferListWrapped } from './apiFixtures';
import { mockApiRoutes, reply } from './fetchMock';
import { deferFetch, settlePendingFetches } from './fetchPending';
import { holdNextResponse } from './homeHelpers';
import { holdNextList } from './transferListRefreshHelpers';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function mockBalanceAndList() {
  mockApiRoutes({ balance: reply(200, balanceOk), transferList: reply(200, transferListWrapped) });
}

function lastFetchResult(): Promise<Response> {
  return jest.mocked(global.fetch).mock.results.at(-1)?.value;
}

// Cierra lo retenido y comprueba que la petición termina sin dejar el tope del cliente en marcha.
async function expectClosedAsAborted(request: Promise<unknown>, held: Promise<Response>) {
  const requestError = request.catch((error: unknown) => error);
  const heldError = held.catch((error: unknown) => error);
  settlePendingFetches();
  await jest.advanceTimersByTimeAsync(0);
  expect(jest.getTimerCount()).toBe(0);
  expect(await heldError).toMatchObject({ name: 'AbortError' });
  expect(await requestError).toMatchObject({ kind: 'network' });
}

function answerFetchWith(response: Promise<Response>) {
  jest.spyOn(global, 'fetch').mockReturnValue(response);
}

describe('peticiones retenidas', () => {
  it('settlePendingFetches rechaza las respuestas retenidas y vacía la lista', async () => {
    const held = deferFetch();
    const reject = jest.spyOn(held, 'reject');

    settlePendingFetches();
    settlePendingFetches();

    await expect(held.promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(reject).toHaveBeenCalledTimes(1);
  });

  it('una petición retenida con deferFetch no deja ningún temporizador del cliente al terminar el test', async () => {
    answerFetchWith(deferFetch().promise);
    const pending = getBalance();
    expect(jest.getTimerCount()).toBe(1);

    settlePendingFetches();

    await expect(pending).rejects.toMatchObject({ kind: 'network' });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('deferFetch devuelve una respuesta retenida que el test puede resolver o rechazar', async () => {
    const answered = deferFetch();
    answerFetchWith(answered.promise);
    const balance = getBalance();
    answered.resolve(new Response(JSON.stringify(balanceOk), { status: 200, headers: JSON_HEADERS }));
    await expect(balance).resolves.toEqual({ amount: 1800, currency: 'USD' });

    const failed = deferFetch();
    answerFetchWith(failed.promise);
    const failure = getBalance();
    failed.reject(new TypeError('Network request failed'));
    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({ kind: 'network' });
  });
});

describe('ayudantes que retienen una petición', () => {
  it('holdNextResponse deja la petición del saldo retenida y registrada para cerrarla al terminar el test', async () => {
    mockBalanceAndList();
    holdNextResponse();
    await expect(getTransfers()).resolves.toHaveLength(transferListWrapped.transfers.length);

    const balance = getBalance();
    await expectClosedAsAborted(balance, lastFetchResult());
  });

  it('holdNextList deja la petición del listado retenida y registrada para cerrarla al terminar el test', async () => {
    mockBalanceAndList();
    holdNextList();
    await expect(getBalance()).resolves.toEqual({ amount: 1800, currency: 'USD' });

    const list = getTransfers();
    await expectClosedAsAborted(list, lastFetchResult());
  });
});
