import type { LoginErrors, LoginField } from './validateLogin';
import { normalizeEmail, validateEmail, validateLogin, validatePassword } from './validateLogin';

const EMAIL_REQUIRED = 'Escribe tu correo.';
const EMAIL_INVALID = 'Escribe un correo válido.';
const PASSWORD_REQUIRED = 'Escribe tu contraseña.';
const DOMAIN = '@ejemplo.com';

function emailOfLength(length: number): string {
  return 'a'.repeat(length - DOMAIN.length) + DOMAIN;
}

it.each(['', '   '])('pide el correo si está vacío o solo tiene espacios: «%s»', (email) => {
  expect(validateEmail(email)).toBe(EMAIL_REQUIRED);
});

it.each([
  'anaejemplo.com',
  'ana@@ejemplo.com',
  'ana@x@ejemplo.com',
  '@ejemplo.com',
  'ana@',
  'ana@ejemplo',
  'ana@.com',
  'ana@ejemplo.',
  'ana@ejemplo..com',
  'ana@ejemplo.c',
  'ana maria@ejemplo.com',
])('rechaza el correo sin formato válido: «%s»', (email) => {
  expect(validateEmail(email)).toBe(EMAIL_INVALID);
});

it('acepta un correo de 254 caracteres y rechaza uno de 255', () => {
  expect(validateEmail(emailOfLength(254))).toBeUndefined();
  expect(validateEmail(` ${emailOfLength(254)} `)).toBeUndefined();
  expect(validateEmail(emailOfLength(255))).toBe(EMAIL_INVALID);
  expect(validateEmail(` ${emailOfLength(255)} `)).toBe(EMAIL_INVALID);
});

it.each(['ana@ejemplo.co', ' ana@ejemplo.com ', 'Ana@Ejemplo.com'])(
  'acepta el correo con espacios en los extremos y mayúsculas: «%s»',
  (email) => {
    expect(validateEmail(email)).toBeUndefined();
  },
);

it.each([
  [' ana@ejemplo.com ', 'ana@ejemplo.com'],
  ['Ana@Ejemplo.com', 'Ana@Ejemplo.com'],
  ['  Ana@Ejemplo.com  ', 'Ana@Ejemplo.com'],
])('normaliza el correo recortando sin cambiar mayúsculas: «%s»', (email, expected) => {
  expect(normalizeEmail(email)).toBe(expected);
});

it.each([
  ['', PASSWORD_REQUIRED],
  ['1', undefined],
  ['   ', undefined],
])('pide la contraseña solo si está vacía: «%s»', (password, expected) => {
  expect(validatePassword(password)).toBe(expected);
});

it.each<[string, Record<LoginField, string>, LoginErrors]>([
  ['ambos válidos', { email: 'ana@ejemplo.com', password: 'secreta' }, {}],
  ['solo el correo con error', { email: 'ana@ejemplo', password: 'secreta' }, { email: EMAIL_INVALID }],
  ['solo la contraseña con error', { email: 'ana@ejemplo.com', password: '' }, { password: PASSWORD_REQUIRED }],
  ['ambos vacíos', { email: '', password: '' }, { email: EMAIL_REQUIRED, password: PASSWORD_REQUIRED }],
  ['correo roto y contraseña vacía', { email: 'ana', password: '' }, { email: EMAIL_INVALID, password: PASSWORD_REQUIRED }],
])('devuelve el mensaje de cada campo con error: %s', (_case, values, expected) => {
  expect(validateLogin(values)).toStrictEqual(expected);
});
