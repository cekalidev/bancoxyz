import { amountToCents } from './money';

it.each([
  [999.994, 99_999],
  [999.995, 100_000],
  [1000.004, 100_000],
  [-150.505, -15_051],
])('redondea a centavos como el importe que se ve: %s → %s', (amount, cents) => {
  expect(amountToCents(amount)).toBe(cents);
});
