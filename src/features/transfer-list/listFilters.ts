import { EMPTY_FILTERS } from './filterTransfers';
import type { AmountBounds, DateBounds, FilterSheet, ListFilters } from './types';

export type ListFiltersState = { filters: ListFilters; openSheet: FilterSheet };

export type ListFiltersAction =
  | { type: 'setQuery'; query: string }
  | { type: 'clearQuery' }
  | { type: 'open'; sheet: Exclude<FilterSheet, null> }
  | { type: 'close' }
  | { type: 'applyAmount'; bounds: AmountBounds }
  | { type: 'removeAmount' }
  | { type: 'applyDates'; bounds: DateBounds }
  | { type: 'removeDates' }
  | { type: 'clearAll' };

type Handler<A extends ListFiltersAction> = (state: ListFiltersState, action: A) => ListFiltersState;
type Handlers = { [A in ListFiltersAction as A['type']]: Handler<A> };

export const INITIAL_LIST_FILTERS_STATE: ListFiltersState = {
  filters: EMPTY_FILTERS,
  openSheet: null,
};

function withFilters(state: ListFiltersState, changes: Partial<ListFilters>): ListFiltersState {
  return { ...state, filters: { ...state.filters, ...changes } };
}

function withFiltersClosingSheet(state: ListFiltersState, changes: Partial<ListFilters>): ListFiltersState {
  return { ...withFilters(state, changes), openSheet: null };
}

const handlers: Handlers = {
  setQuery: (state, { query }) => withFilters(state, { query }),
  clearQuery: (state) => withFilters(state, { query: '' }),
  open: (state, { sheet }) => ({ ...state, openSheet: sheet }),
  close: (state) => ({ ...state, openSheet: null }),
  applyAmount: (state, { bounds }) => withFiltersClosingSheet(state, { amount: bounds }),
  removeAmount: (state) => withFiltersClosingSheet(state, { amount: EMPTY_FILTERS.amount }),
  applyDates: (state, { bounds }) => withFiltersClosingSheet(state, { dates: bounds }),
  removeDates: (state) => withFiltersClosingSheet(state, { dates: EMPTY_FILTERS.dates }),
  clearAll: () => INITIAL_LIST_FILTERS_STATE,
};

export function listFiltersReducer(state: ListFiltersState, action: ListFiltersAction): ListFiltersState {
  const handle = handlers[action.type] as Handler<ListFiltersAction>;

  return handle(state, action);
}
