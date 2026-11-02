import type { Transfer } from '@/services/api/types';
import { compareDates, type CalendarDate } from '@/utils/date';
import { amountToCents } from '@/utils/money';
import { foldForSearch } from '@/utils/normalizeText';

import type { AmountBounds, DateBounds, IndexedTransfer, ListFilters } from './types';

export function sortNewestFirst(transfers: Transfer[]): IndexedTransfer[] {
  return transfers
    .map((transfer, receivedIndex) => ({ transfer, receivedIndex }))
    .sort((a, b) => compareDates(b.transfer.date, a.transfer.date) || a.receivedIndex - b.receivedIndex);
}

export function matchesQuery(name: string, query: string): boolean {
  return foldForSearch(name).includes(foldForSearch(query.trim()));
}

export function inAmountBounds(amount: number, { min, max }: AmountBounds): boolean {
  const cents = amountToCents(amount);

  return (min === null || cents >= min) && (max === null || cents <= max);
}

export function inDateBounds(date: CalendarDate, { from, to }: DateBounds): boolean {
  const onOrAfterFrom = from === null || compareDates(date, from) >= 0;
  const onOrBeforeTo = to === null || compareDates(date, to) <= 0;

  return onOrAfterFrom && onOrBeforeTo;
}

export function applyFilters(
  sorted: IndexedTransfer[],
  { query, amount, dates }: ListFilters,
): IndexedTransfer[] {
  return sorted.filter(
    ({ transfer }) =>
      matchesQuery(transfer.payeeName, query) &&
      inAmountBounds(transfer.amount, amount) &&
      inDateBounds(transfer.date, dates),
  );
}

export const EMPTY_FILTERS: ListFilters = {
  query: '',
  amount: { min: null, max: null },
  dates: { from: null, to: null },
};

export function hasBounds(bounds: AmountBounds | DateBounds): boolean {
  return Object.values(bounds).some((bound) => bound !== null);
}

export function isFiltering({ query, amount, dates }: ListFilters): boolean {
  return query.trim() !== '' || hasBounds(amount) || hasBounds(dates);
}
