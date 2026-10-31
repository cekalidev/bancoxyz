import { greetingFor } from './greeting';

const LONG_NAME = `${'Ana '.repeat(19)}Anas`;

const cases = [
  { caso: 'normal', name: 'Gabriel', expected: 'Hola, Gabriel' },
  { caso: 'nombre completo', name: 'Gabriel Topaz', expected: 'Hola, Gabriel Topaz' },
  { caso: 'espacios en los extremos', name: '  Gabriel  ', expected: 'Hola, Gabriel' },
  { caso: 'tabulador y salto de línea en los extremos', name: '\tGabriel\n', expected: 'Hola, Gabriel' },
  { caso: 'varios espacios internos', name: 'Gabriel   Topaz', expected: 'Hola, Gabriel   Topaz' },
  { caso: 'tildes y eñes', name: 'José Muñoz', expected: 'Hola, José Muñoz' },
  { caso: 'muy largo (80 caracteres)', name: LONG_NAME, expected: `Hola, ${LONG_NAME}` },
  { caso: 'vacío', name: '', expected: 'Hola' },
  { caso: 'solo espacios', name: '   ', expected: 'Hola' },
];

it.each(cases)(
  'saluda con el nombre recortado en los extremos o solo Hola si queda vacío: $caso',
  ({ name, expected }) => {
    expect(greetingFor(name)).toBe(expected);
  },
);
