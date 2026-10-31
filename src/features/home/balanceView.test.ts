import { ApiError, ERROR_MESSAGES } from '@/services/api/errors';
import type { Balance } from '@/services/api/types';

import { balanceErrorMessage, isSessionExpired, selectBalanceView } from './balanceView';

const BALANCE: Balance = { amount: 1800, currency: 'USD' };
const FAILURE = new ApiError('network');

const cases = [
  { caso: 'sin cifra ni aviso', data: undefined, error: null, expected: 'skeleton' },
  { caso: 'solo aviso', data: undefined, error: FAILURE, expected: 'error' },
  { caso: 'cifra sin aviso', data: BALANCE, error: null, expected: 'card' },
  { caso: 'cifra y aviso', data: BALANCE, error: FAILURE, expected: 'card' },
] as const;

it.each(cases)(
  'elige skeleton, aviso o tarjeta según haya cifra y aviso: $caso',
  ({ data, error, expected }) => {
    expect(selectBalanceView({ data, error })).toBe(expected);
  },
);

const NETWORK_MESSAGE = 'No hay conexión. Revisa tu internet e inténtalo de nuevo.';
const UNKNOWN_MESSAGE = 'Algo salió mal. Inténtalo de nuevo.';

const errorCases = [
  { caso: 'sin conexión', error: new ApiError('network'), expected: NETWORK_MESSAGE },
  { caso: 'datos inválidos', error: new ApiError('badRequest'), expected: UNKNOWN_MESSAGE },
  { caso: 'error desconocido', error: new ApiError('unknown'), expected: UNKNOWN_MESSAGE },
  { caso: 'error no tipado', error: new Error('fallo interno'), expected: UNKNOWN_MESSAGE },
] as const;

it.each(errorCases)(
  'elige el mensaje de cada error sin usar el de datos inválidos: $caso',
  ({ error, expected }) => {
    const message = balanceErrorMessage(error);

    expect(message).toBe(expected);
    expect(message).not.toBe(ERROR_MESSAGES.badRequest);
  },
);

const sessionCases = [
  { caso: 'sesión caducada', error: new ApiError('unauthorized'), expected: true },
  { caso: 'datos inválidos', error: new ApiError('badRequest'), expected: false },
  { caso: 'credenciales incorrectas', error: new ApiError('invalidCredentials'), expected: false },
  { caso: 'sin conexión', error: new ApiError('network'), expected: false },
  { caso: 'error desconocido', error: new ApiError('unknown'), expected: false },
  { caso: 'error no tipado', error: new Error('fallo interno'), expected: false },
] as const;

it.each(sessionCases)('reconoce la sesión caducada: $caso', ({ error, expected }) => {
  expect(isSessionExpired(error)).toBe(expected);
});
