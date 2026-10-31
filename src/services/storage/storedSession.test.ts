import type { Session } from '@/services/api/types';

import { parseStoredSession } from './storedSession';

const user = { id: 7, name: 'Ana Prueba', email: 'ana@ejemplo.com' };
const session: Session = { token: 'token-de-prueba', user };

function storedWith(overrides: Record<string, unknown>): string {
  return JSON.stringify({ ...session, ...overrides });
}

function storedWithUser(overrides: Record<string, unknown>): string {
  return storedWith({ user: { ...user, ...overrides } });
}

const damagedSessions: [string, string][] = [
  ['JSON roto', '{"token": "token-de-prueba"'],
  ['marca de sesión cerrada', 'closed'],
  ['texto vacío', ''],
  ['JSON que no es un objeto', 'null'],
  ['token ausente', storedWith({ token: undefined })],
  ['token vacío', storedWith({ token: '' })],
  ['token numérico', storedWith({ token: 123 })],
  ['sin usuario', storedWith({ user: undefined })],
  ['usuario nulo', storedWith({ user: null })],
  ['id ausente', storedWithUser({ id: undefined })],
  ['id como texto', storedWithUser({ id: '1' })],
  ['nombre ausente', storedWithUser({ name: undefined })],
  ['nombre vacío', storedWithUser({ name: '' })],
  ['nombre numérico', storedWithUser({ name: 42 })],
  ['correo ausente', storedWithUser({ email: undefined })],
  ['correo vacío', storedWithUser({ email: '' })],
  ['correo numérico', storedWithUser({ email: 42 })],
];

it('reconoce una sesión guardada válida', () => {
  expect(parseStoredSession(JSON.stringify(session))).toStrictEqual({ status: 'valid', session });
});

it('devuelve solo el token y los datos del usuario aunque haya más campos guardados', () => {
  const raw = storedWith({ extra: 'x', user: { ...user, role: 'admin' } });

  expect(parseStoredSession(raw)).toStrictEqual({ status: 'valid', session });
});

it('sin nada guardado no hay sesión', () => {
  expect(parseStoredSession(null)).toStrictEqual({ status: 'empty' });
});

it.each(damagedSessions)(
  'trata como dañada una sesión que no cumple la forma esperada: %s',
  (_case, raw) => {
    expect(parseStoredSession(raw)).toStrictEqual({ status: 'damaged' });
  },
);
