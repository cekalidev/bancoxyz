import { useRef } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import { Screen } from '@/components/Screen';

import { isFiltering } from '../filterTransfers';
import type { ListFiltersControls } from '../useListFilters';
import { useListRows } from '../useListRows';
import { useScrollTopOnNotice } from '../useScrollTopOnNotice';
import type { ListSnapshot, TransferRow } from '../types';
import { FilterSheets } from './FilterSheets';
import { ListControls } from './ListControls';
import { ListSeparator } from './ListSeparator';
import { ListTop, type RefreshNotice } from './ListTop';
import { NoResults } from './NoResults';
import { TransferListItem } from './TransferListItem';

type TransferListBodyProps = { snapshot: ListSnapshot; filters: ListFiltersControls; notice: RefreshNotice };

const keyOf = (row: TransferRow) => row.key;
const renderRow = ({ item }: { item: TransferRow }) => <TransferListItem row={item} />;

// Búsqueda y chips fijos arriba; debajo, la lista desplazable con el aviso de la recarga y el contador en su cabecera.
// Sin refreshControl: el listado no se recarga al deslizar hacia abajo.
export function TransferListBody({ snapshot, filters, notice }: TransferListBodyProps) {
  const { rows, counter, currency } = useListRows(snapshot, filters.filters);
  const listRef = useRef<FlatList<TransferRow>>(null);
  useScrollTopOnNotice(listRef, notice, rows.length > 0);
  const top = (
    <ListTop
      notice={notice}
      counter={counter}
      showClear={isFiltering(filters.filters) && rows.length > 0}
      onClear={filters.clearAll}
    />
  );

  return (
    <Screen>
      <ListControls filters={filters} currency={currency} />
      <FlatList
        ref={listRef}
        style={styles.list}
        data={rows}
        keyExtractor={keyOf}
        renderItem={renderRow}
        ItemSeparatorComponent={ListSeparator}
        ListHeaderComponent={top}
        ListEmptyComponent={<NoResults onClear={filters.clearAll} />}
        keyboardShouldPersistTaps="handled"
      />
      <FilterSheets filters={filters} currency={currency} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
});
