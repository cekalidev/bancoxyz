import { loginOk, sessionUnauthorized } from '@/test/apiFixtures';
import { mockFetchPendingEach, mockFetchResponse } from '@/test/fetchMock';

import { getBalance } from './balance';
import { configureApi, markLoggedIn, markLoggedOut } from './client';
import { ApiError } from './errors';
import { login } from './login';
import { getTransfers } from './transfers';

const onUnauthorized = jest.fn();

beforeEach(() => {
  configureApi({ getToken: () => 'token-de-prueba-123', onUnauthorized });
});

afterEach(() => {
  jest.restoreAllMocks();
  onUnauthorized.mockReset();
});

async function expectSessionExpired(result: Promise<unknown>): Promise<void> {
  await expect(result).rejects.toBeInstanceOf(ApiError);
  await expect(result).rejects.toMatchObject({ kind: 'unauthorized' });
}

describe('aviso tras un nuevo login', () => {
  it('tras un nuevo login un 401 vuelve a avisar aunque la sesión anterior ya avisara', async () => {
    mockFetchResponse(401, sessionUnauthorized);
    await expectSessionExpired(getBalance());
    expect(onUnauthorized).toHaveBeenCalledTimes(1);

    markLoggedOut();
    mockFetchResponse(200, loginOk);
    await login('gabriel@topaz.com', '1111');

    mockFetchResponse(401, sessionUnauthorized);
    await expectSessionExpired(getTransfers());
    expect(onUnauthorized).toHaveBeenCalledTimes(2);
  });
});

describe('401 de una sesión anterior', () => {
  it('ignora el 401 de una petición empezada antes de salir y le devuelve su error', async () => {
    const pending = mockFetchPendingEach();
    const oldRequest = getBalance();

    markLoggedOut();
    pending.resolve(0, 401, sessionUnauthorized);

    await expectSessionExpired(oldRequest);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('ignora el 401 de una petición empezada antes de un nuevo login', async () => {
    const pending = mockFetchPendingEach();
    const oldRequest = getBalance();
    const newLogin = login('gabriel@topaz.com', '1111');
    pending.resolve(1, 200, loginOk);
    await newLogin;

    pending.resolve(0, 401, sessionUnauthorized);

    await expectSessionExpired(oldRequest);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('el 401 ignorado no consume el aviso de la sesión vigente', async () => {
    const pending = mockFetchPendingEach();
    const oldRequest = getBalance();
    markLoggedIn();
    pending.resolve(0, 401, sessionUnauthorized);
    await expectSessionExpired(oldRequest);
    expect(onUnauthorized).not.toHaveBeenCalled();

    const currentRequest = getTransfers();
    pending.resolve(1, 401, sessionUnauthorized);

    await expectSessionExpired(currentRequest);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
