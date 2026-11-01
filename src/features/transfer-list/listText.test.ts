import type { Transfer } from '@/services/api/types';

import { counterText, sharedCurrency } from './listText';

const baseTransfer: Transfer = {
  payeeName: 'Lionel Andres Messi',
  payeeDocument: '11029920288',
  amount: 3500,
  currency: 'USD',
  date: { year: 2024, month: 6, day: 12 },
};

describe('counterText', () => {
  it.each([
    { visible: 3, total: 3, filtering: false, expected: '3 transferencias' },
    { visible: 1, total: 1, filtering: false, expected: '1 transferencia' },
    { visible: 3, total: 3, filtering: false, expected: '3 transferencias' },
    { visible: 1, total: 3, filtering: true, expected: '1 de 3 transferencias' },
    { visible: 0, total: 3, filtering: true, expected: '0 de 3 transferencias' },
    { visible: 1, total: 1, filtering: true, expected: '1 de 1 transferencia' },
    { visible: 0, total: 1, filtering: true, expected: '0 de 1 transferencia' },
  ])('el contador dice cuántas se ven y cuántas hay', ({ visible, total, filtering, expected }) => {
    expect(counterText(visible, total, filtering)).toBe(expected);
  });
});

describe('sharedCurrency', () => {
  it.each([
    { currencies: ['USD', 'USD', 'USD'] as const, expected: 'USD' },
    { currencies: ['USD', 'BRL'] as const, expected: null },
  ])('hay moneda común solo si todas comparten la misma', ({ currencies, expected }) => {
    const transfers = currencies.map((currency) => ({ ...baseTransfer, currency }));

    expect(sharedCurrency(transfers)).toBe(expected);
  });
});
