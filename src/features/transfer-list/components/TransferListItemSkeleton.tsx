import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Skeleton } from '@/components/Skeleton';
import { layout, spacing, typography } from '@/theme';

// Forma de una fila del listado: nombre y detalle a la izquierda y el importe a la derecha.
export function TransferListItemSkeleton() {
  const { fontScale } = useWindowDimensions();

  return (
    <View style={styles.row}>
      <View style={styles.lines}>
        <Skeleton width="60%" height={typography.label.lineHeight * fontScale} tone="surface" />
        <Skeleton width="80%" height={typography.caption.lineHeight * fontScale} tone="surface" />
      </View>
      <Skeleton width="30%" height={typography.amount.lineHeight * fontScale} tone="surface" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    minHeight: layout.listItemMinHeight,
    paddingVertical: spacing.md,
  },
  lines: {
    flex: 1,
    gap: spacing.xxs,
  },
});
