import { useMemo } from 'react';

import { applyFilters, isFiltering, sortNewestFirst } from './filterTransfers';
import { counterText, sharedCurrency } from './listText';
import { toTransferRow } from './transferRow';
import type { ListFilters, ListSnapshot } from './types';

// Filas visibles, contador y moneda común, calculados siempre desde los datos recibidos.
export function useListRows(snapshot: ListSnapshot, filters: ListFilters) {
  return useMemo(() => {
    const visible = applyFilters(sortNewestFirst(snapshot.transfers), filters);

    return {
      rows: visible.map((item) => toTransferRow(item, snapshot.today)),
      counter: counterText(visible.length, snapshot.transfers.length, isFiltering(filters)),
      currency: sharedCurrency(snapshot.transfers),
    };
  }, [snapshot, filters]);
}
