import { waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

import { getBalance } from '@/services/api/balance';
import { configureApi } from '@/services/api/client';
import type { Session } from '@/services/api/types';
import { SESSION_KEY } from '@/services/storage/sessionStorage';
import { sessionUnauthorized } from '@/test/apiFixtures';
import { mockFetchPendingEach, type PendingEachFetch } from '@/test/fetchMock';
import {
  holdNextWrite,
  seedStoredValue,
  storedValue,
} from '@/test/secureStoreMock';

import { expireSession, signIn, signOut } from './sessionActions';
import { INITIAL_SESSION_STATE, useSessionStore } from './sessionStore';

const session: Session = {
  token: 'token-de-prueba',
  user: { id: 7, name: 'Ana Prueba', email: 'ana@ejemplo.com' },
};
const onUnauthorized = jest.fn();

beforeEach(() => {
  useSessionStore.setState(INITIAL_SESSION_STATE, true);
  configureApi({
    getToken: () => useSessionStore.getState().session?.token ?? null,
    onUnauthorized,
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  onUnauthorized.mockReset();
});

function startActiveSession(): void {
  useSessionStore.setState({ session });
  seedStoredValue(JSON.stringify(session));
}

async function resolveWithUnauthorized(
  request: Promise<unknown>,
  pending: PendingEachFetch,
): Promise<void> {
  pending.resolve(0, 401, sessionUnauthorized);
  await expect(request).rejects.toMatchObject({ kind: 'unauthorized' });
}

describe('inicio de sesión', () => {
  it('al iniciar sesión guarda la sesión en memoria y pide guardarla cifrada sin esperar', async () => {
    useSessionStore.setState({ expiredEmail: 'otro@ejemplo.com' });
    const releaseWrite = holdNextWrite();

    signIn(session);

    expect(useSessionStore.getState()).toStrictEqual({
      session,
      expiredEmail: null,
    });
    expect(storedValue()).toBeNull();
    await waitFor(() =>
      expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1),
    );
    expect(useSessionStore.getState().session).toStrictEqual(session);
    expect(storedValue()).toBeNull();

    releaseWrite();

    await waitFor(() =>
      expect(storedValue(SESSION_KEY)).toBe(JSON.stringify(session)),
    );
  });
});

describe('salida', () => {
  it('al salir borra la sesión de memoria y del almacenamiento sin aviso ni correo', async () => {
    startActiveSession();
    const pending = mockFetchPendingEach();
    const requestBeforeLeaving = getBalance();

    signOut();

    expect(useSessionStore.getState()).toStrictEqual(INITIAL_SESSION_STATE);
    await waitFor(() => expect(storedValue()).toBeNull());
    await resolveWithUnauthorized(requestBeforeLeaving, pending);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});

describe('sesión caducada', () => {
  it('al caducar la sesión la borra y guarda en memoria el correo del usuario', async () => {
    startActiveSession();
    const pending = mockFetchPendingEach();
    const requestBeforeExpiring = getBalance();

    expireSession();

    expect(useSessionStore.getState()).toStrictEqual({
      session: null,
      expiredEmail: 'ana@ejemplo.com',
    });
    await waitFor(() => expect(storedValue()).toBeNull());
    await resolveWithUnauthorized(requestBeforeExpiring, pending);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('cerrar la sesión caducada sin sesión no hace nada', async () => {
    useSessionStore.setState({ expiredEmail: 'previo@ejemplo.com' });
    seedStoredValue('valor-guardado');
    const pending = mockFetchPendingEach();
    const request = getBalance();

    expireSession();

    expect(useSessionStore.getState()).toStrictEqual({
      session: null,
      expiredEmail: 'previo@ejemplo.com',
    });
    await resolveWithUnauthorized(request, pending);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    expect(storedValue()).toBe('valor-guardado');
  });
});
