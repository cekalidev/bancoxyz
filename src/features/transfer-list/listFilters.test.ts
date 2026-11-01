import { listFiltersReducer, type ListFiltersAction, type ListFiltersState } from './listFilters';
import type { AmountBounds, DateBounds, FilterSheet, ListFilters } from './types';

const activeFilters: ListFilters = {
  query: 'messi',
  amount: { min: 1000, max: 500000 },
  dates: {
    from: { year: 2024, month: 1, day: 5 },
    to: { year: 2024, month: 6, day: 30 },
  },
};

function stateWith(filters: ListFilters, openSheet: FilterSheet = null): ListFiltersState {
  return { filters, openSheet };
}

it.each(['messi', '   ', 'José '])(
  'borrar la búsqueda la vacía y conserva los filtros de valor y de fecha',
  (query) => {
    const state = stateWith({ ...activeFilters, query });

    const next = listFiltersReducer(state, { type: 'clearQuery' });

    expect(next.filters).toEqual({ ...activeFilters, query: '' });
    expect(next.openSheet).toBeNull();
  },
);

it.each(['messi', '  ', ' ana ', 'José Pérez', 'a'])(
  'escribir guarda el texto tal cual, también con espacios',
  (query) => {
    const state = stateWith({ ...activeFilters, query: 'previo' });

    const next = listFiltersReducer(state, { type: 'setQuery', query });

    expect(next.filters.query).toBe(query);
    expect(next.filters.amount).toEqual(activeFilters.amount);
    expect(next.filters.dates).toEqual(activeFilters.dates);
  },
);

it.each<FilterSheet>(['amount', 'date'])('cerrar la hoja no cambia ningún filtro', (openSheet) => {
  const state = stateWith(activeFilters, openSheet);

  const next = listFiltersReducer(state, { type: 'close' });

  expect(next.filters).toEqual(activeFilters);
  expect(next.openSheet).toBeNull();
});

it.each(['amount', 'date'] as const)(
  'abrir una hoja la marca como abierta y cerrarla la deja en ninguna',
  (sheet) => {
    const opened = listFiltersReducer(stateWith(activeFilters), {
      type: 'open',
      sheet,
    });
    const closed = listFiltersReducer(opened, { type: 'close' });

    expect(opened).toEqual({ filters: activeFilters, openSheet: sheet });
    expect(closed).toEqual({ filters: activeFilters, openSheet: null });
  },
);

it.each<AmountBounds>([
  { min: 2000, max: 90000 },
  { min: 0, max: 0 },
  { min: 0, max: null },
  { min: null, max: 2000 },
  { min: null, max: null },
])('aplicar el valor cierra la hoja y con los dos extremos vacíos lo quita', (bounds) => {
  const state = stateWith(activeFilters, 'amount');

  const next = listFiltersReducer(state, { type: 'applyAmount', bounds });

  expect(next.filters).toEqual({ ...activeFilters, amount: bounds });
  expect(next.openSheet).toBeNull();
});

it.each<FilterSheet>(['amount', null])(
  'quitar el valor deja la búsqueda y la fecha',
  (openSheet) => {
    const state = stateWith(activeFilters, openSheet);

    const next = listFiltersReducer(state, { type: 'removeAmount' });

    expect(next.filters).toEqual({ ...activeFilters, amount: { min: null, max: null } });
    expect(next.openSheet).toBeNull();
  },
);

it.each<DateBounds>([
  { from: { year: 2024, month: 2, day: 1 }, to: { year: 2024, month: 2, day: 29 } },
  { from: { year: 2024, month: 3, day: 10 }, to: { year: 2024, month: 3, day: 10 } },
  { from: { year: 2024, month: 2, day: 1 }, to: null },
  { from: null, to: { year: 2024, month: 2, day: 29 } },
  { from: null, to: null },
])('aplicar las fechas cierra la hoja y con los dos extremos vacíos las quita', (bounds) => {
  const state = stateWith(activeFilters, 'date');

  const next = listFiltersReducer(state, { type: 'applyDates', bounds });

  expect(next.filters).toEqual({ ...activeFilters, dates: bounds });
  expect(next.openSheet).toBeNull();
});

it.each<FilterSheet>(['date', null])(
  'quitar las fechas deja la búsqueda y el valor',
  (openSheet) => {
    const state = stateWith(activeFilters, openSheet);

    const next = listFiltersReducer(state, { type: 'removeDates' });

    expect(next.filters).toEqual({ ...activeFilters, dates: { from: null, to: null } });
    expect(next.openSheet).toBeNull();
  },
);

const noFilters: ListFilters = {
  query: '',
  amount: { min: null, max: null },
  dates: { from: null, to: null },
};

it.each<[ListFilters, FilterSheet]>([
  [activeFilters, null],
  [activeFilters, 'amount'],
  [activeFilters, 'date'],
  [{ ...noFilters, query: 'messi' }, null],
  [{ ...noFilters, query: '   ' }, null],
  [{ ...noFilters, amount: { min: 0, max: null } }, null],
  [{ ...noFilters, amount: { min: null, max: 2000 } }, null],
  [{ ...noFilters, dates: { from: { year: 2024, month: 2, day: 1 }, to: null } }, null],
  [{ ...noFilters, dates: { from: null, to: { year: 2024, month: 2, day: 29 } } }, null],
  [noFilters, null],
])('limpiar filtros vacía la búsqueda y quita valor y fecha', (filters, openSheet) => {
  const state = stateWith(filters, openSheet);

  const next = listFiltersReducer(state, { type: 'clearAll' });

  expect(next).toEqual({ filters: noFilters, openSheet: null });
});

it.each<[ListFiltersAction, Partial<ListFilters>]>([
  [
    { type: 'applyAmount', bounds: { min: 2000, max: 90000 } },
    { query: activeFilters.query, dates: activeFilters.dates },
  ],
  [
    {
      type: 'applyDates',
      bounds: { from: { year: 2024, month: 2, day: 1 }, to: { year: 2024, month: 2, day: 29 } },
    },
    { query: activeFilters.query, amount: activeFilters.amount },
  ],
  [{ type: 'removeAmount' }, { query: activeFilters.query, dates: activeFilters.dates }],
  [{ type: 'removeDates' }, { query: activeFilters.query, amount: activeFilters.amount }],
  [
    { type: 'setQuery', query: 'ana' },
    { amount: activeFilters.amount, dates: activeFilters.dates },
  ],
])('aplicar, cambiar o quitar un filtro conserva los otros dos', (action, untouched) => {
  const state = stateWith(activeFilters);

  const next = listFiltersReducer(state, action);

  expect(next.filters).toMatchObject(untouched);
});
