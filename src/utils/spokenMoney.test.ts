import { spokenMoney } from './spokenMoney';

it.each([
  [1, 'USD', '1,00 dólares'],
  [1800, 'USD', '1.800,00 dólares'],
  [0, 'USD', '0,00 dólares'],
  [-150, 'USD', 'menos 150,00 dólares'],
  [1234567.89, 'USD', '1.234.567,89 dólares'],
  [1500.5, 'BRL', '1.500,50 reales'],
  [10, 'EUR', '10,00 euros'],
  [10, 'CLP', '10,00 CLP'],
])('dice el importe con su moneda en español o con su código', (amount, currency, expected) => {
  expect(spokenMoney(amount, currency)).toBe(expected);
});

it('antepone menos a un saldo negativo y no a uno que redondea a cero', () => {
  expect(spokenMoney(-150, 'USD')).toBe('menos 150,00 dólares');
  expect(spokenMoney(-0.001, 'USD')).toBe('0,00 dólares');
});
