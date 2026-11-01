import { ApiError } from '@/services/api/errors';
import type { Transfer } from '@/services/api/types';

import { selectListView } from './listView';
import type { ListSnapshot } from './types';

const today = { year: 2026, month: 10, day: 31 };

const messi: Transfer = {
  payeeName: 'Lionel Andres Messi',
  payeeDocument: '11029920288',
  amount: 3500,
  currency: 'USD',
  date: { year: 2024, month: 6, day: 12 },
};

const withTransfers: ListSnapshot = { transfers: [messi], today };
const withoutTransfers: ListSnapshot = { transfers: [], today };

it('sin datos ni error es el skeleton y con datos el listado', () => {
  expect(selectListView({ data: undefined, error: null })).toBe('skeleton');
  expect(selectListView({ data: withTransfers, error: null })).toBe('list');
});

it('sin datos y con error es el aviso de primera carga', () => {
  expect(selectListView({ data: undefined, error: new ApiError('network') })).toBe('firstError');
  expect(selectListView({ data: undefined, error: new ApiError('unknown') })).toBe('firstError');
  expect(selectListView({ data: undefined, error: new Error('fallo interno') })).toBe('firstError');
});

it('con la lista vacía es el vacío sin datos', () => {
  expect(selectListView({ data: withoutTransfers, error: null })).toBe('empty');
});

it('con datos y error sigue siendo el listado o el vacío', () => {
  const failure = new ApiError('network');

  expect(selectListView({ data: withTransfers, error: failure })).toBe('list');
  expect(selectListView({ data: withoutTransfers, error: failure })).toBe('empty');
});
