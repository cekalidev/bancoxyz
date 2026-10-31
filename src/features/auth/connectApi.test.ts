import { getBalance } from '@/services/api/balance';
import type { Session } from '@/services/api/types';
import { balanceOk, sessionUnauthorized } from '@/test/apiFixtures';
import { lastFetchCall, mockFetchResponse } from '@/test/fetchMock';

import { connectApiToSession } from './connectApi';
import { INITIAL_SESSION_STATE, useSessionStore } from './sessionStore';

const session: Session = {
  token: 'token-de-prueba',
  user: { id: 7, name: 'Ana Prueba', email: 'ana@ejemplo.com' },
};

beforeEach(() => {
  useSessionStore.setState(INITIAL_SESSION_STATE, true);
});

afterEach(jest.restoreAllMocks);

it('envía el token de la sesión en las peticiones autenticadas y cierra la sesión ante un 401', async () => {
  useSessionStore.setState({ session });
  connectApiToSession();

  mockFetchResponse(200, balanceOk);
  await getBalance();
  expect(lastFetchCall().headers.Authorization).toBe('Bearer token-de-prueba');

  mockFetchResponse(401, sessionUnauthorized);
  await expect(getBalance()).rejects.toMatchObject({ kind: 'unauthorized' });
  expect(useSessionStore.getState()).toStrictEqual({ session: null, expiredEmail: 'ana@ejemplo.com' });
});
