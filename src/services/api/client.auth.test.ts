import { balanceOk, loginOk, loginUnauthorized, sessionUnauthorized, transfersOk } from '@/test/apiFixtures';
import { lastFetchCall, mockFetchResponse } from '@/test/fetchMock';

import { getBalance } from './balance';
import { configureApi } from './client';
import { ApiError, ERROR_MESSAGES } from './errors';
import { login } from './login';
import { createTransfer } from './transfer';
import { getTransfers } from './transfers';

const onUnauthorized = jest.fn();
let token: string | null = null;

const newTransfer = {
  amount: 100,
  currency: 'USD',
  payeeDocument: '12345678900',
  date: { year: 2026, month: 3, day: 7 },
};

beforeEach(() => {
  token = 'token-de-prueba-123';
  configureApi({ getToken: () => token, onUnauthorized });
});

afterEach(() => {
  jest.restoreAllMocks();
  onUnauthorized.mockReset();
});

async function expectSessionExpired(result: Promise<unknown>): Promise<void> {
  await expect(result).rejects.toBeInstanceOf(ApiError);
  await expect(result).rejects.toMatchObject({ kind: 'unauthorized' });
}

describe('cabecera de autorización', () => {
  it('envía el token recibido en el login en saldo, transferencia y listado', async () => {
    token = null;
    mockFetchResponse(200, { ...loginOk, token: 'token-de-prueba-123' });
    const session = await login('gabriel@topaz.com', '1111');
    token = session.token;
    const expected = 'Bearer token-de-prueba-123';

    mockFetchResponse(200, balanceOk);
    await getBalance();
    expect(lastFetchCall().headers.Authorization).toBe(expected);

    mockFetchResponse(200, { status: 'success' });
    await createTransfer(newTransfer);
    expect(lastFetchCall().headers.Authorization).toBe(expected);

    mockFetchResponse(200, transfersOk);
    await getTransfers();
    expect(lastFetchCall().headers.Authorization).toBe(expected);
  });

  it('no envía Authorization si no hay token y trata el 401 como sesión caducada', async () => {
    token = null;
    mockFetchResponse(401, sessionUnauthorized);

    await expectSessionExpired(getBalance());

    expect(lastFetchCall().headers).not.toHaveProperty('Authorization');
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});

describe('sesión caducada', () => {
  it('convierte un 401 con sesión en sesión caducada y avisa', async () => {
    mockFetchResponse(401, sessionUnauthorized);

    const result = getBalance();

    await expectSessionExpired(result);
    await expect(result).rejects.toMatchObject({ message: ERROR_MESSAGES.unauthorized });
    expect(ERROR_MESSAGES.unauthorized).toBe('Tu sesión expiró. Inicia sesión de nuevo.');
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('sigue dando sesión caducada aunque el aviso falle', async () => {
    onUnauthorized.mockImplementation(() => {
      throw new Error('fallo del aviso');
    });
    mockFetchResponse(401, sessionUnauthorized);

    await expectSessionExpired(getBalance());
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});

describe('aviso único de sesión caducada', () => {
  it('avisa una sola vez ante varios 401 seguidos', async () => {
    mockFetchResponse(401, sessionUnauthorized);

    await expectSessionExpired(getBalance());
    const results = await Promise.allSettled([getBalance(), getTransfers()]);

    for (const result of results) {
      expect(result.status).toBe('rejected');
      if (result.status === 'rejected') expect(result.reason).toMatchObject({ kind: 'unauthorized' });
    }
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('vuelve a avisar tras un login correcto', async () => {
    mockFetchResponse(401, sessionUnauthorized);
    await expectSessionExpired(getBalance());

    mockFetchResponse(200, loginOk);
    await login('gabriel@topaz.com', '1111');

    mockFetchResponse(401, sessionUnauthorized);
    await expectSessionExpired(getTransfers());
    expect(onUnauthorized).toHaveBeenCalledTimes(2);
  });

  it('un login fallido no reinicia el aviso', async () => {
    mockFetchResponse(401, sessionUnauthorized);
    await expectSessionExpired(getBalance());

    mockFetchResponse(401, loginUnauthorized);
    await expect(login('gabriel@topaz.com', 'incorrecta')).rejects.toMatchObject({
      kind: 'invalidCredentials',
    });

    mockFetchResponse(401, sessionUnauthorized);
    await expectSessionExpired(getBalance());
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
