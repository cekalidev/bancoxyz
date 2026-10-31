import { formatAmountParts, formatMoney, maskedMoney } from './money';

const NBSP = '\u00a0';

it('formatea importes en pt-BR con el símbolo de la moneda', () => {
  const cases: [number, string, string][] = [
    [1500.5, 'BRL', `R$${NBSP}1.500,50`],
    [1800, 'USD', `US$${NBSP}1.800,00`],
    [0, 'BRL', `R$${NBSP}0,00`],
    [-150, 'BRL', `-R$${NBSP}150,00`],
    [1234567.891, 'BRL', `R$${NBSP}1.234.567,89`],
    [2.345, 'BRL', `R$${NBSP}2,35`],
    [10, 'EUR', `€${NBSP}10,00`],
    [10, 'CLP', `CLP${NBSP}10,00`],
  ];

  const received = cases.map(([amount, currency]) => formatMoney(amount, currency));

  expect(received).toEqual(cases.map(([, , expected]) => expected));
});

it('usa el símbolo pt-BR de otras monedas y el código si no tiene', () => {
  expect(formatMoney(10, 'GBP')).toBe(`£${NBSP}10,00`);
  expect(formatMoney(10, 'EUR')).toBe(`€${NBSP}10,00`);
  expect(formatMoney(10, 'JPY')).toBe(`JP¥${NBSP}10,00`);
  expect(formatMoney(10, 'CLP')).toBe(`CLP${NBSP}10,00`);
});

it('separa símbolo e importe con un espacio no separable', () => {
  const text = formatMoney(1500.5, 'BRL');

  expect(text).toContain('\u00a0');
  expect(text).not.toContain(' ');
});

it('no muestra signo en cero', () => {
  expect(formatMoney(0, 'BRL')).toBe(`R$${NBSP}0,00`);
  expect(formatMoney(-0, 'BRL')).toBe(`R$${NBSP}0,00`);
  expect(formatMoney(-0.004, 'BRL')).toBe(`R$${NBSP}0,00`);
  expect(formatMoney(-0.005, 'BRL')).toBe(`-R$${NBSP}0,01`);
});

it('lanza RangeError ante un importe que no es un número finito', () => {
  expect(() => formatMoney(NaN, 'BRL')).toThrow(RangeError);
  expect(() => formatMoney(Infinity, 'BRL')).toThrow(RangeError);
  expect(() => formatMoney(-Infinity, 'BRL')).toThrow(RangeError);
});

it.each([
  { amount: 1800, expected: { negative: false, digits: '1.800,00' } },
  { amount: 0, expected: { negative: false, digits: '0,00' } },
  { amount: 1234567.89, expected: { negative: false, digits: '1.234.567,89' } },
  { amount: -150, expected: { negative: true, digits: '150,00' } },
  { amount: -0.001, expected: { negative: false, digits: '0,00' } },
])('formatea el importe sin símbolo con la regla de signo de la cifra', ({ amount, expected }) => {
  expect(formatAmountParts(amount)).toEqual(expected);
});

it.each([
  { currency: 'USD', expected: `US$${NBSP}••••••` },
  { currency: 'BRL', expected: `R$${NBSP}••••••` },
  { currency: 'EUR', expected: `€${NBSP}••••••` },
  { currency: 'CLP', expected: `CLP${NBSP}••••••` },
])('oculta cualquier saldo con el símbolo y seis puntos', ({ currency, expected }) => {
  const masked = maskedMoney(currency);

  expect(masked).toBe(expected);
  expect(masked.match(/•/g)).toHaveLength(6);
});
