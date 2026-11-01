import type { Transfer } from '@/services/api/types';
import type { CalendarDate } from '@/utils/date';

import { EMPTY_FILTERS } from './filterTransfers';
import type { IndexedTransfer, ListFilters } from './types';

export const ronaldo: Transfer = {
  payeeName: 'Ronaldo de Assis Moreira',
  payeeDocument: '12019910177',
  amount: 1000,
  currency: 'USD',
  date: { year: 2024, month: 8, day: 25 },
};
export const messi: Transfer = {
  payeeName: 'Lionel Andres Messi',
  payeeDocument: '11029920288',
  amount: 3500,
  currency: 'USD',
  date: { year: 2024, month: 6, day: 12 },
};
export const valverde: Transfer = {
  payeeName: 'Federico Valverde',
  payeeDocument: '13039930399',
  amount: 2000,
  currency: 'USD',
  date: { year: 2024, month: 6, day: 12 },
};

export const RANGE_AMOUNTS = [999.99, 1000, 1000.01, 3500];
export const RANGE_ROWS = [
  { bounds: { min: 100000, max: null }, expected: [1000, 1000.01, 3500] },
  { bounds: { min: 100001, max: null }, expected: [1000.01, 3500] },
  { bounds: { min: null, max: 100000 }, expected: [999.99, 1000] },
  { bounds: { min: null, max: 99999 }, expected: [999.99] },
  { bounds: { min: 100000, max: 100000 }, expected: [1000] },
  { bounds: { min: 100001, max: 349999 }, expected: [1000.01] },
  { bounds: { min: 350001, max: null }, expected: [] },
  { bounds: { min: null, max: 99998 }, expected: [] },
  { bounds: { min: 999999999999, max: null }, expected: [] },
];
export const ROUNDING_ROWS = [
  { amount: 999.994, bounds: { min: 100000, max: null }, expected: false },
  { amount: 999.995, bounds: { min: 100000, max: null }, expected: true },
  { amount: 1000.004, bounds: { min: 100000, max: null }, expected: true },
  { amount: 999.994, bounds: { min: null, max: 99999 }, expected: true },
  { amount: 999.995, bounds: { min: null, max: 99999 }, expected: false },
  { amount: 1000.004, bounds: { min: null, max: 99999 }, expected: false },
];
export const ZERO_ROWS = [
  { amount: 1000, bounds: { min: 0, max: null }, expected: true },
  { amount: 0, bounds: { min: 0, max: null }, expected: true },
  { amount: -0.01, bounds: { min: 0, max: null }, expected: false },
  { amount: -0.01, bounds: { min: null, max: null }, expected: true },
  { amount: 1000, bounds: { min: null, max: 0 }, expected: false },
  { amount: 0.01, bounds: { min: null, max: 0 }, expected: false },
  { amount: 0, bounds: { min: null, max: 0 }, expected: true },
  { amount: 0, bounds: { min: 0, max: 0 }, expected: true },
  { amount: 0.01, bounds: { min: 0, max: 0 }, expected: false },
];

export const JUN_01: CalendarDate = { year: 2024, month: 6, day: 1 };
export const JUN_11: CalendarDate = { year: 2024, month: 6, day: 11 };
export const JUN_12: CalendarDate = { year: 2024, month: 6, day: 12 };
export const JUN_13: CalendarDate = { year: 2024, month: 6, day: 13 };
export const JUN_30: CalendarDate = { year: 2024, month: 6, day: 30 };
export const AUG_25: CalendarDate = { year: 2024, month: 8, day: 25 };
export const AUG_26: CalendarDate = { year: 2024, month: 8, day: 26 };
export const ALL_NAMES = [ronaldo.payeeName, messi.payeeName, valverde.payeeName];
export const JUNE_NAMES = [messi.payeeName, valverde.payeeName];
export const DATE_ROWS = [
  { dates: { from: JUN_12, to: null }, expected: ALL_NAMES },
  { dates: { from: JUN_13, to: null }, expected: [ronaldo.payeeName] },
  { dates: { from: null, to: JUN_12 }, expected: JUNE_NAMES },
  { dates: { from: null, to: JUN_11 }, expected: [] },
  { dates: { from: JUN_12, to: JUN_12 }, expected: JUNE_NAMES },
  { dates: { from: AUG_25, to: AUG_25 }, expected: [ronaldo.payeeName] },
  { dates: { from: JUN_01, to: JUN_30 }, expected: JUNE_NAMES },
  { dates: { from: AUG_26, to: null }, expected: [] },
];

const NO_AMOUNT = { min: null, max: null };
const NO_DATES = { from: null, to: null };
const AMOUNT_2K_TO_4K = { min: 200000, max: 400000 };
const JUNE_2024 = { from: JUN_01, to: JUN_30 };

export const COMBINATION_ROWS: { filters: ListFilters; expected: string[] }[] = [
  { filters: { query: 'a', amount: NO_AMOUNT, dates: NO_DATES }, expected: ALL_NAMES },
  { filters: { query: 'a', amount: AMOUNT_2K_TO_4K, dates: NO_DATES }, expected: JUNE_NAMES },
  { filters: { query: 'a', amount: AMOUNT_2K_TO_4K, dates: JUNE_2024 }, expected: JUNE_NAMES },
  {
    filters: { query: 'mes', amount: AMOUNT_2K_TO_4K, dates: JUNE_2024 },
    expected: [messi.payeeName],
  },
  { filters: { query: 'ronaldo', amount: AMOUNT_2K_TO_4K, dates: NO_DATES }, expected: [] },
  {
    filters: { query: '', amount: NO_AMOUNT, dates: { from: AUG_25, to: AUG_25 } },
    expected: [ronaldo.payeeName],
  },
  {
    filters: { query: '', amount: { min: 300000, max: null }, dates: { from: JUN_13, to: null } },
    expected: [],
  },
];

export const RELOAD_FILTERS: ListFilters = {
  query: 'mes',
  amount: AMOUNT_2K_TO_4K,
  dates: NO_DATES,
};
const messiScheduled: Transfer = {
  ...messi,
  amount: 2500,
  date: { year: 2026, month: 11, day: 1 },
};

export const RELOAD_ROWS: { received: Transfer[]; visible: IndexedTransfer[]; total: number }[] = [
  { received: [ronaldo, messi, valverde], visible: [{ transfer: messi, receivedIndex: 1 }], total: 3 },
  {
    received: [ronaldo, messi, valverde, messiScheduled],
    visible: [
      { transfer: messiScheduled, receivedIndex: 3 },
      { transfer: messi, receivedIndex: 1 },
    ],
    total: 4,
  },
  { received: [ronaldo, valverde], visible: [], total: 2 },
  { received: [], visible: [], total: 0 },
];

type FilteringRow = { filters: ListFilters; expected: boolean };

export const FILTERING_ROWS: FilteringRow[] = [
  { filters: EMPTY_FILTERS, expected: false },
  { filters: { ...EMPTY_FILTERS, query: '   ' }, expected: false },
  { filters: { ...EMPTY_FILTERS, query: '\t\n' }, expected: false },
  { filters: { ...EMPTY_FILTERS, query: 'a' }, expected: true },
  { filters: { ...EMPTY_FILTERS, query: '  a  ' }, expected: true },
  { filters: { ...EMPTY_FILTERS, amount: { min: 100000, max: null } }, expected: true },
  { filters: { ...EMPTY_FILTERS, amount: { min: null, max: 100000 } }, expected: true },
  { filters: { ...EMPTY_FILTERS, dates: { from: JUN_12, to: null } }, expected: true },
  { filters: { ...EMPTY_FILTERS, dates: { from: null, to: JUN_12 } }, expected: true },
];
export const ZERO_FILTERING_ROWS: FilteringRow[] = [
  { filters: { ...EMPTY_FILTERS, amount: { min: 0, max: null } }, expected: true },
  { filters: { ...EMPTY_FILTERS, amount: { min: null, max: 0 } }, expected: true },
  { filters: { ...EMPTY_FILTERS, amount: { min: 0, max: 0 } }, expected: true },
  { filters: { ...EMPTY_FILTERS, query: '   ', amount: { min: 0, max: null } }, expected: true },
];
