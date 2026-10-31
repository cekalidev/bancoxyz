import { balanceOk } from '@/test/apiFixtures';
import { lastFetchCall, mockFetchResponse } from '@/test/fetchMock';

import { getBalance } from './balance';
import { configureApi } from './client';
import { API_URLS } from './endpoints';
import { ApiError, ERROR_MESSAGES } from './errors';

beforeEach(() => configureApi({ getToken: () => null, onUnauthorized: jest.fn() }));

afterEach(() => jest.restoreAllMocks());

describe('getBalance', () => {
  it('convierte el saldo de la API en importe y moneda', async () => {
    mockFetchResponse(200, balanceOk);

    await expect(getBalance()).resolves.toEqual({ amount: 1800, currency: 'USD' });
    expect(lastFetchCall()).toMatchObject({ url: API_URLS.balance, method: 'GET' });
  });

  it('rechaza un saldo con importe como texto o con moneda vacía, en minúsculas o símbolo', async () => {
    const invalidBodies = [
      { ...balanceOk, accountBalance: '1800.00' },
      { ...balanceOk, currency: '' },
      { ...balanceOk, currency: 'usd' },
      { ...balanceOk, currency: 'R$' },
    ];

    for (const body of invalidBodies) {
      mockFetchResponse(200, body);
      const result = getBalance();
      await expect(result).rejects.toBeInstanceOf(ApiError);
      await expect(result).rejects.toMatchObject({ kind: 'unknown', message: ERROR_MESSAGES.unknown });
    }
    expect(ERROR_MESSAGES.unknown).toBe('Algo salió mal. Inténtalo de nuevo.');
  });
});
