import { transferListWrapped, transfersOk } from '@/test/apiFixtures';
import { lastFetchCall, mockFetchResponse } from '@/test/fetchMock';

import { configureApi } from './client';
import { API_URLS } from './endpoints';
import { ApiError, ERROR_MESSAGES } from './errors';
import { getTransfers } from './transfers';

beforeEach(() => configureApi({ getToken: () => 'token', onUnauthorized: jest.fn() }));

afterEach(() => jest.restoreAllMocks());

describe('getTransfers: petición y formas del listado', () => {
  it('pide el listado a la URL transferList', async () => {
    mockFetchResponse(200, transferListWrapped);

    await getTransfers();

    const call = lastFetchCall();
    expect(call.url).toBe(API_URLS.transferList);
    expect(call.url.endsWith('/transferList')).toBe(true);
    expect(call.method).toBe('GET');
  });

  it('acepta el listado envuelto y la lista directa con el mismo resultado', async () => {
    mockFetchResponse(200, transferListWrapped);
    const fromWrapped = await getTransfers();
    mockFetchResponse(200, transfersOk);
    const fromDirect = await getTransfers();

    expect(fromDirect).toEqual(fromWrapped);
    expect(fromWrapped).toHaveLength(transfersOk.length);
    expect(fromWrapped[0]).toEqual({
      payeeName: 'Ronaldo de Assis Moreira',
      payeeDocument: '12019910177',
      amount: 1000,
      currency: 'USD',
      date: { year: 2024, month: 8, day: 25 },
    });
  });
});

describe('getTransfers: orden, listados no válidos y vacíos', () => {
  it('conserva el orden recibido', async () => {
    mockFetchResponse(200, transferListWrapped);

    const transfers = await getTransfers();

    expect(transfers.map((transfer) => transfer.payeeName)).toEqual([
      'Ronaldo de Assis Moreira',
      'Lionel Andres Messi',
      'Federico Valverde',
    ]);
  });

  it('falla entero si un elemento tiene fecha o moneda no válidas', async () => {
    const [validItem] = transfersOk;
    const invalidLists = [
      [validItem, { ...transfersOk[1], date: '2026-02-30' }],
      [validItem, { ...transfersOk[1], currency: 'usd' }],
    ];

    for (const list of invalidLists) {
      mockFetchResponse(200, list);
      const result = getTransfers();
      await expect(result).rejects.toBeInstanceOf(ApiError);
      await expect(result).rejects.toMatchObject({ kind: 'unknown', message: ERROR_MESSAGES.unknown });
    }
  });

  it('devuelve una lista vacía sin error', async () => {
    mockFetchResponse(200, []);
    await expect(getTransfers()).resolves.toEqual([]);

    mockFetchResponse(200, { transfers: [] });
    await expect(getTransfers()).resolves.toEqual([]);
  });
});

describe('getTransfers: elementos incompletos', () => {
  it('falla si falta el destinatario, el importe no es un número o no hay lista', async () => {
    const [validItem, secondItem] = transfersOk;
    const invalidResponses = [
      [validItem, { ...secondItem, payeer: undefined }],
      [validItem, { ...secondItem, value: '1000' }],
      { message: 'x' },
    ];

    for (const body of invalidResponses) {
      mockFetchResponse(200, body);
      const result = getTransfers();
      await expect(result).rejects.toBeInstanceOf(ApiError);
      await expect(result).rejects.toMatchObject({ kind: 'unknown', message: ERROR_MESSAGES.unknown });
    }
  });
});
