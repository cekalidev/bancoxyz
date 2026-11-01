import type { Ref } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import type { PressableInstance } from 'react-native';

import { FilterChip } from '@/components/FilterChip';
import { layout, spacing } from '@/theme';

import { amountChipLabel, amountChipText } from '../amountSummary';
import { dateChipLabel, dateChipText } from '../dateSummary';
import { hasBounds } from '../filterTransfers';
import type { AmountBounds, DateBounds } from '../types';

export type FilterChipsProps = {
  amount: AmountBounds;
  dates: DateBounds;
  currency: string | null;
  onOpenAmount: () => void;
  onOpenDates: () => void;
  amountChipRef: Ref<PressableInstance>;
  dateChipRef: Ref<PressableInstance>;
};

// Fila de chips «Valor» y «Fecha»: desliza en horizontal si no caben (fuente grande, pantallas angostas).
export function FilterChips({
  amount,
  dates,
  currency,
  onOpenAmount,
  onOpenDates,
  amountChipRef,
  dateChipRef,
}: FilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      <FilterChip
        text={amountChipText(amount, currency)}
        spokenLabel={amountChipLabel(amount, currency)}
        selected={hasBounds(amount)}
        onPress={onOpenAmount}
        chipRef={amountChipRef}
      />
      <FilterChip
        text={dateChipText(dates)}
        spokenLabel={dateChipLabel(dates)}
        selected={hasBounds(dates)}
        onPress={onOpenDates}
        chipRef={dateChipRef}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Sin crecer: en una columna, el ScrollView horizontal no debe repartirse el alto sobrante.
  scroll: {
    flexGrow: 0,
  },
  // Espacio vertical para que el hitSlop de los chips no quede recortado por el ScrollView, y el
  // margen de la pantalla dentro de la fila para que el último chip no se corte en seco al deslizar.
  row: {
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
    paddingHorizontal: layout.screenPadding,
  },
});
