import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { spacing } from '@/theme';

type SheetActionsProps = {
  filterApplied: boolean;
  onApply: () => void;
  onRemove: () => void;
};

export function SheetActions({ filterApplied, onApply, onRemove }: SheetActionsProps) {
  return (
    <View style={styles.actions}>
      <Button label="Aplicar" onPress={onApply} />
      {filterApplied ? <Button variant="ghost" label="Quitar filtro" onPress={onRemove} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.xs,
  },
});
