import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { SearchIcon } from '@/components/icons/SearchIcon';
import { spacing } from '@/theme';

import { CLEAR_FILTERS_LABEL, NO_RESULTS_TEXT, NO_RESULTS_TITLE } from '../listText';

type NoResultsProps = { onClear: () => void };

// Vacío por filtros: hay datos, pero ninguno coincide; su botón es el único «Limpiar filtros» a la vista.
export function NoResults({ onClear }: NoResultsProps) {
  return (
    <View style={styles.container}>
      <EmptyState
        Icon={SearchIcon}
        title={NO_RESULTS_TITLE}
        text={NO_RESULTS_TEXT}
        action={{ label: CLEAR_FILTERS_LABEL, variant: 'secondary', onPress: onClear }}
      />
    </View>
  );
}

// Aire entre el separador del contador y el icono.
const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xl,
  },
});
