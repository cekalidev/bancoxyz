import type { Transfer } from '@/services/api/types';

import {
  applyFilters,
  inAmountBounds,
  inDateBounds,
  isFiltering,
  matchesQuery,
  sortNewestFirst,
} from './filterTransfers';
import {
  COMBINATION_ROWS,
  DATE_ROWS,
  FILTERING_ROWS,
  messi,
  RANGE_AMOUNTS,
  RANGE_ROWS,
  RELOAD_FILTERS,
  RELOAD_ROWS,
  ROUNDING_ROWS,
  ronaldo,
  valverde,
  ZERO_FILTERING_ROWS,
  ZERO_ROWS,
} from './filterTransfers.cases';

describe('sortNewestFirst', () => {
  it.each([
    {
      received: [valverde, ronaldo, messi],
      expected: [
        { transfer: ronaldo, receivedIndex: 1 },
        { transfer: valverde, receivedIndex: 0 },
        { transfer: messi, receivedIndex: 2 },
      ],
    },
    {
      received: [messi, valverde],
      expected: [
        { transfer: messi, receivedIndex: 0 },
        { transfer: valverde, receivedIndex: 1 },
      ],
    },
  ])(
    'ordena por fecha descendente y conserva el orden recibido en los empates',
    ({ received, expected }) => {
      expect(sortNewestFirst(received)).toEqual(expected);
    },
  );
});

describe('matchesQuery', () => {
  const ronaldoName = ronaldo.payeeName;
  const messiName = messi.payeeName;
  const valverdeName = valverde.payeeName;

  it.each([
    { query: '', expected: [ronaldoName, messiName, valverdeName] },
    { query: '   ', expected: [ronaldoName, messiName, valverdeName] },
    { query: 'MESSI', expected: [messiName] },
    { query: 'valvérde', expected: [valverdeName] },
    { query: '  messi  ', expected: [messiName] },
    { query: 'de assis', expected: [ronaldoName] },
    { query: 're', expected: [ronaldoName, messiName] },
    { query: '110299', expected: [] },
    { query: 'zzz', expected: [] },
    { query: 'x'.repeat(100), expected: [] },
  ])(
    'la búsqueda por nombre da exactamente las filas de cada partición',
    ({ query, expected }) => {
      const names = sortNewestFirst([ronaldo, messi, valverde])
        .map(({ transfer }) => transfer.payeeName)
        .filter((name) => matchesQuery(name, query));

      expect(names).toEqual(expected);
    },
  );
});

describe('inAmountBounds', () => {
  it.each(RANGE_ROWS)(
    'el rango de valor es inclusivo y un extremo vacío no limita',
    ({ bounds, expected }) => {
      expect(RANGE_AMOUNTS.filter((amount) => inAmountBounds(amount, bounds))).toEqual(expected);
    },
  );

  it.each(ROUNDING_ROWS)(
    'el filtro de valor compara el importe redondeado a centavos',
    ({ amount, bounds, expected }) => {
      expect(inAmountBounds(amount, bounds)).toBe(expected);
    },
  );

  it.each(ZERO_ROWS)('cero es un límite y no equivale a vacío', ({ amount, bounds, expected }) => {
    expect(inAmountBounds(amount, bounds)).toBe(expected);
  });

  it('con varias monedas compara el número sin convertir', () => {
    const messiBrl: Transfer = { ...messi, amount: 1000, currency: 'BRL' };
    const valverdeBrl: Transfer = { ...valverde, amount: 500, currency: 'BRL' };

    const names = [ronaldo, messiBrl, valverdeBrl]
      .filter(({ amount }) => inAmountBounds(amount, { min: 100000, max: null }))
      .map(({ payeeName }) => payeeName);

    expect(names).toEqual([ronaldo.payeeName, messi.payeeName]);
  });
});

describe('inDateBounds', () => {
  it.each(DATE_ROWS)(
    'el rango de fechas es inclusivo por día local y un extremo vacío no limita',
    ({ dates, expected }) => {
      const names = sortNewestFirst([ronaldo, messi, valverde])
        .filter(({ transfer }) => inDateBounds(transfer.date, dates))
        .map(({ transfer }) => transfer.payeeName);

      expect(names).toEqual(expected);
    },
  );
});

describe('applyFilters', () => {
  it.each(COMBINATION_ROWS)('los tres filtros se combinan con Y', ({ filters, expected }) => {
    const names = applyFilters(sortNewestFirst([ronaldo, messi, valverde]), filters).map(
      ({ transfer }) => transfer.payeeName,
    );

    expect(names).toEqual(expected);
  });

  it.each(RELOAD_ROWS)(
    'una recarga reaplica la búsqueda y el valor sobre los datos nuevos',
    ({ received, visible, total }) => {
      const sorted = sortNewestFirst(received);

      expect(applyFilters(sorted, RELOAD_FILTERS)).toEqual(visible);
      expect(sorted).toHaveLength(total);
    },
  );
});

describe('isFiltering', () => {
  it.each(FILTERING_ROWS)(
    'una búsqueda de solo espacios no es un filtro activo',
    ({ filters, expected }) => {
      expect(isFiltering(filters)).toBe(expected);
    },
  );

  it.each(ZERO_FILTERING_ROWS)(
    'un límite de valor 0 cuenta como filtro activo',
    ({ filters, expected }) => {
      expect(isFiltering(filters)).toBe(expected);
    },
  );
});
