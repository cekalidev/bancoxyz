import { Fragment } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Skeleton } from '@/components/Skeleton';
import { layout, radii, spacing, typography } from '@/theme';

import { ListSeparator } from './ListSeparator';
import { TransferListItemSkeleton } from './TransferListItemSkeleton';

const ROWS = 6;

// Carga del listado: la forma de la búsqueda, los chips, el contador y las filas separadas como en la lista,
// anunciada como un solo grupo ocupado.
export function TransfersSkeleton() {
  const { fontScale } = useWindowDimensions();

  return (
    <View accessible accessibilityLabel="Cargando…" accessibilityState={{ busy: true }}>
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <HeaderSkeleton fontScale={fontScale} />
        <View style={styles.counter}>
          <Skeleton width="30%" height={typography.caption.lineHeight * fontScale} tone="surface" />
        </View>
        <ListSeparator />
        <View>
          {Array.from({ length: ROWS }, (_, index) => (
            <Fragment key={index}>
              {index > 0 ? <ListSeparator /> : null}
              <TransferListItemSkeleton />
            </Fragment>
          ))}
        </View>
      </View>
    </View>
  );
}

// Cabecera fija: etiqueta y campo de búsqueda, y debajo los dos chips.
function HeaderSkeleton({ fontScale }: { fontScale: number }) {
  return (
    <View style={styles.header}>
      <View style={styles.search}>
        <Skeleton width="40%" height={typography.label.lineHeight * fontScale} tone="surface" />
        <Skeleton width="100%" height={layout.inputHeight} radius={radii.input} tone="surface" />
      </View>
      <View style={styles.chips}>
        <ChipSkeleton />
        <ChipSkeleton />
      </View>
    </View>
  );
}

function ChipSkeleton() {
  return (
    <Skeleton
      width={layout.chipSkeletonWidth}
      height={layout.chipHeight}
      radius={radii.pill}
      tone="surface"
    />
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
  },
  search: {
    gap: spacing.xs,
  },
  // Mismo espacio vertical que la fila real de chips: mide lo mismo y nada salta al terminar la carga.
  chips: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  // Mismo alto que la fila del contador real: las filas no bajan al terminar la carga.
  counter: {
    marginTop: spacing.md,
    minHeight: layout.minTouch,
    justifyContent: 'center',
  },
});
