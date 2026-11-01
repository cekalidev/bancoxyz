import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { spacing } from '@/theme';

import { hasBounds } from '../filterTransfers';
import type { AmountBounds } from '../types';
import { useAmountDraft } from '../useAmountDraft';
import { AmountBoundField } from './AmountBoundField';
import { SheetActions } from './SheetActions';

type AmountFilterSheetProps = {
  applied: AmountBounds;
  currency: string | null;
  onApply: (bounds: AmountBounds) => void;
  onRemove: () => void;
  onClose: () => void;
};

export function AmountFilterSheet({
  applied,
  currency,
  onApply,
  onRemove,
  onClose,
}: AmountFilterSheetProps) {
  const { draft, fromRef, toRef, change, clear, apply } = useAmountDraft(applied, onApply);

  return (
    <BottomSheet title="Filtrar por valor" closeLabel="Cerrar filtro de valor" onClose={onClose}>
      <View style={styles.fields}>
        <AmountBoundField
          label="Desde"
          value={draft.texts.from}
          onChangeText={(text) => change('from', text)}
          onClear={() => clear('from')}
          currency={currency}
          inputRef={fromRef}
        />
        <AmountBoundField
          label="Hasta"
          value={draft.texts.to}
          onChangeText={(text) => change('to', text)}
          onClear={() => clear('to')}
          currency={currency}
          error={draft.error ?? undefined}
          inputRef={toRef}
        />
      </View>
      <SheetActions filterApplied={hasBounds(applied)} onApply={apply} onRemove={onRemove} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
});
