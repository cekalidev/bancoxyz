import { currencyName } from './spokenMoney';

it.each([
  ['USD', false, 'dólares'],
  ['USD', true, 'dólar'],
  ['BRL', false, 'reales'],
  ['BRL', true, 'real'],
  ['EUR', false, 'euros'],
  ['EUR', true, 'euro'],
  ['JPY', false, 'JPY'],
  ['JPY', true, 'JPY'],
])('nombra la moneda en plural o en singular', (currency, singular, expected) => {
  expect(currencyName(currency, singular)).toBe(expected);
});
