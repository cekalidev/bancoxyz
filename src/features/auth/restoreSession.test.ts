import { waitFor } from '@testing-library/react-native';

import { getBalance } from '@/services/api/balance';
import { configureApi } from '@/services/api/client';
import type { Session } from '@/services/api/types';
import { sessionUnauthorized } from '@/test/apiFixtures';
import { mockFetchResponse } from '@/test/fetchMock';
import { failNextRead, seedStoredValue, storedValue } from '@/test/secureStoreMock';
import { prepareSessionTest, seedSession } from '@/test/sessionHelpers';

import { restoreSession } from './restoreSession';
import { useSessionStore } from './sessionStore';

const session: Session = {
  token: 'token-de-prueba',
  user: { id: 7, name: 'Ana Prueba', email: 'ana@ejemplo.com' },
};

beforeEach(prepareSessionTest);

afterEach(jest.restoreAllMocks);

it('restaura una sesión válida sin hacer peticiones', async () => {
  const fetchSpy = jest.spyOn(global, 'fetch');
  seedSession(session);

  await restoreSession();

  expect(useSessionStore.getState().session).toStrictEqual(session);
  expect(fetchSpy).not.toHaveBeenCalled();
});

it('una sesión restaurada vuelve a avisar ante un 401 aunque una sesión anterior ya avisara', async () => {
  const onUnauthorized = jest.fn();
  configureApi({ getToken: () => useSessionStore.getState().session?.token ?? null, onUnauthorized });
  mockFetchResponse(401, sessionUnauthorized);
  await expect(getBalance()).rejects.toMatchObject({ kind: 'unauthorized' });
  expect(onUnauthorized).toHaveBeenCalledTimes(1);

  seedSession(session);
  await restoreSession();

  await expect(getBalance()).rejects.toMatchObject({ kind: 'unauthorized' });
  expect(onUnauthorized).toHaveBeenCalledTimes(2);
});

it.each([
  ['un contenido dañado', () => seedStoredValue('{"token": "token-de-prueba"')],
  [
    'una lectura fallida',
    () => {
      seedSession(session);
      failNextRead();
    },
  ],
])('borra una sesión dañada o una lectura fallida y queda sin sesión: %s', async (_case, arrange) => {
  arrange();

  await expect(restoreSession()).resolves.toBeUndefined();

  expect(useSessionStore.getState().session).toBeNull();
  await waitFor(() => expect(storedValue()).toBeNull());
});
