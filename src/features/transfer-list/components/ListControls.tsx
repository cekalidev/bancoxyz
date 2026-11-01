import { StyleSheet, View } from 'react-native';

import { layout, spacing } from '@/theme';

import type { ListFiltersControls } from '../useListFilters';
import { FilterChips } from './FilterChips';
import { SearchField } from './SearchField';

type ListControlsProps = { filters: ListFiltersControls; currency: string | null };

// Cabecera fija del listado: la búsqueda y, debajo, la fila de chips.
export function ListControls({ filters, currency }: ListControlsProps) {
  const { dispatch } = filters;

  return (
    <View style={styles.header}>
      <SearchField
        query={filters.filters.query}
        onChangeText={(query) => dispatch({ type: 'setQuery', query })}
        onClear={filters.clearQuery}
        inputRef={filters.searchRef}
      />
      <View style={styles.fullWidth}>
        <FilterChips
          amount={filters.filters.amount}
          dates={filters.filters.dates}
          currency={currency}
          onOpenAmount={() => filters.open('amount')}
          onOpenDates={() => filters.open('date')}
          amountChipRef={filters.amountChipRef}
          dateChipRef={filters.dateChipRef}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
  },
  // Los chips llegan a los bordes de la pantalla: el margen lo pone su propia fila desplazable.
  fullWidth: {
    marginHorizontal: -layout.screenPadding,
  },
});
