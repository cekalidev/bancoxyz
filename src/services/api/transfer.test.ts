import { lastFetchCall, mockFetchRawBody, mockFetchResponse } from '@/test/fetchMock';

import { configureApi } from './client';
import { API_URLS } from './endpoints';
import { ApiError, ERROR_MESSAGES } from './errors';
import { createTransfer } from './transfer';
import type { NewTransfer } from './types';

const newTransfer: NewTransfer = {
  amount: 100.5,
  currency: 'USD',
  payeeDocument: '12345678900',
  date: { year: 2026, month: 3, day: 7 },
};

beforeEach(() => configureApi({ getToken: () => 'token', onUnauthorized: jest.fn() }));

afterEach(() => jest.restoreAllMocks());

describe('createTransfer', () => {
  it('envía importe, moneda, documento y fecha AAAA-MM-DD', async () => {
    const fetchSpy = mockFetchResponse(200, { status: 'success' });

    await createTransfer(newTransfer);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(lastFetchCall()).toMatchObject({ url: API_URLS.transfer, method: 'POST' });
    expect(lastFetchCall().body).toEqual({
      value: 100.5,
      currency: 'USD',
      payeerDocument: '12345678900',
      transferDate: '2026-03-07',
    });
  });

  it('solo da éxito con status success', async () => {
    mockFetchResponse(200, { status: 'success' });

    await expect(createTransfer(newTransfer)).resolves.toBeUndefined();
  });

  it('trata un 200 sin status success como error desconocido', async () => {
    const mockInvalidResponses = [
      () => mockFetchResponse(200, {}),
      () => mockFetchResponse(200, { status: 'error' }),
      () => mockFetchResponse(200, { status: 'SUCCESS' }),
      () => mockFetchRawBody(200, ''),
    ];

    for (const mockInvalidResponse of mockInvalidResponses) {
      mockInvalidResponse();
      const result = createTransfer(newTransfer);
      await expect(result).rejects.toBeInstanceOf(ApiError);
      await expect(result).rejects.toMatchObject({ kind: 'unknown', message: ERROR_MESSAGES.unknown });
    }
  });
});
