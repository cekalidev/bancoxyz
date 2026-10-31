import * as SecureStore from 'expo-secure-store';

import type { Session } from '@/services/api/types';
import {
  failDeletes,
  failWrites,
  holdNextWrite,
  seedStoredValue,
  storedValue,
} from '@/test/secureStoreMock';

import {
  CLOSED_MARKER,
  SESSION_KEY,
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
} from './sessionStorage';
import { parseStoredSession } from './storedSession';

const user = { id: 7, name: 'Ana Prueba', email: 'ana@ejemplo.com' };
const session: Session = { token: 'token-de-prueba', user };
const SECURE_STORE_KEY_FORMAT = /^[\w.-]+$/;

describe('guardado de la sesión', () => {
  it('guarda solo token y usuario bajo una clave válida del almacenamiento cifrado', async () => {
    const sessionWithExtras = { ...session, password: '1111', user: { ...user, role: 'admin' } };

    await writeStoredSession(sessionWithExtras);

    expect(SESSION_KEY).toMatch(SECURE_STORE_KEY_FORMAT);
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
    expect(jest.mocked(SecureStore.setItemAsync).mock.calls[0][0]).toBe(SESSION_KEY);
    expect(JSON.parse(storedValue(SESSION_KEY) ?? 'null')).toStrictEqual(session);
  });

  it('la escritura propaga el fallo del almacenamiento a quien la llama', async () => {
    failWrites();

    await expect(writeStoredSession(session)).rejects.toThrow();
    expect(storedValue()).toBeNull();
  });
});

describe('lectura de la sesión', () => {
  it('lee el valor guardado y devuelve null si no hay nada', async () => {
    await expect(readStoredSession()).resolves.toBeNull();

    seedStoredValue(JSON.stringify(session));

    await expect(readStoredSession()).resolves.toBe(JSON.stringify(session));
  });
});

describe('borrado de la sesión', () => {
  it('si el borrado falla deja una marca de sesión cerrada', async () => {
    seedStoredValue(JSON.stringify(session));
    failDeletes();

    await clearStoredSession();

    expect(storedValue()).toBe(CLOSED_MARKER);
    expect(parseStoredSession(storedValue())).toStrictEqual({ status: 'damaged' });
  });

  it('si también falla la marca no rechaza', async () => {
    seedStoredValue(JSON.stringify(session));
    failDeletes();
    failWrites();

    await expect(clearStoredSession()).resolves.toBeUndefined();
  });

  it('un borrado tras un guardado lento se aplica después del guardado', async () => {
    const releaseWrite = holdNextWrite();
    const pendingWrite = writeStoredSession(session);
    const pendingClear = clearStoredSession();

    releaseWrite();
    await Promise.all([pendingWrite, pendingClear]);

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(1);

    const [writeOrder] = jest.mocked(SecureStore.setItemAsync).mock.invocationCallOrder;
    const [deleteOrder] = jest.mocked(SecureStore.deleteItemAsync).mock.invocationCallOrder;
    expect(deleteOrder).toBeGreaterThan(writeOrder);
    expect(storedValue()).toBeNull();
  });
});
