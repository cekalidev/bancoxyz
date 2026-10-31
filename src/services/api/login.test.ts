import { loginOk, loginUnauthorized } from '@/test/apiFixtures';
import { lastFetchCall, mockFetchResponse } from '@/test/fetchMock';

import { configureApi } from './client';
import { API_URLS } from './endpoints';
import { ApiError, ERROR_MESSAGES } from './errors';
import { login } from './login';

const onUnauthorized = jest.fn();

beforeEach(() => configureApi({ getToken: () => null, onUnauthorized }));

afterEach(() => {
  jest.restoreAllMocks();
  onUnauthorized.mockClear();
});

describe('login', () => {
  it('envía correo y contraseña tal cual y devuelve el token y el usuario', async () => {
    mockFetchResponse(200, loginOk);

    await expect(login(' Gabriel@Topaz.com ', '1111')).resolves.toEqual({
      token: 'fake-jwt-token',
      user: { id: 1, name: 'Gabriel Topaz', email: 'gabriel@topaz.com' },
    });

    const call = lastFetchCall();
    expect(call).toMatchObject({
      url: API_URLS.login,
      method: 'POST',
      body: { email: ' Gabriel@Topaz.com ', password: '1111' },
    });
    expect(call.headers['Content-Type']).toBe('application/json');
    expect(call.headers).not.toHaveProperty('Authorization');
  });

  it('convierte un 401 del login en credenciales incorrectas sin avisar de sesión caducada', async () => {
    mockFetchResponse(401, loginUnauthorized);

    const result = login('gabriel@topaz.com', 'incorrecta');

    await expect(result).rejects.toBeInstanceOf(ApiError);
    await expect(result).rejects.toMatchObject({
      kind: 'invalidCredentials',
      message: ERROR_MESSAGES.invalidCredentials,
    });
    expect(ERROR_MESSAGES.invalidCredentials).toBe('Correo o contraseña incorrectos.');
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});

describe('login con una respuesta que no es una sesión válida', () => {
  it('rechaza un login sin usuario, con token vacío o con id como texto', async () => {
    const invalidBodies = [
      { token: 'fake-jwt-token' },
      { token: '', user: loginOk.user },
      { user: loginOk.user },
      { token: 'fake-jwt-token', user: { ...loginOk.user, id: '1' } },
    ];

    for (const body of invalidBodies) {
      mockFetchResponse(200, body);
      const result = login('gabriel@topaz.com', '1111');
      await expect(result).rejects.toBeInstanceOf(ApiError);
      await expect(result).rejects.toMatchObject({ kind: 'unknown', message: ERROR_MESSAGES.unknown });
    }
  });
});
