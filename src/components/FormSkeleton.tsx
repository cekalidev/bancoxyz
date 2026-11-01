import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Skeleton } from '@/components/Skeleton';
import { layout, radii, spacing, typography } from '@/theme';

type FormSkeletonProps = { fields: number };

// Carga de un formulario: la forma de sus campos (etiqueta, caja y ayuda) y del botón, anunciada como un solo grupo ocupado.
export function FormSkeleton({ fields }: FormSkeletonProps) {
  const { fontScale } = useWindowDimensions();

  return (
    <View accessible accessibilityLabel="Cargando…" accessibilityState={{ busy: true }}>
      <View
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={styles.blocks}
      >
        <View style={styles.fields}>
          {Array.from({ length: fields }, (_, index) => (
            <FieldSkeleton key={index} fontScale={fontScale} />
          ))}
        </View>
        <Skeleton width="100%" height={layout.buttonHeight} radius={radii.pill} tone="surface" />
      </View>
    </View>
  );
}

function FieldSkeleton({ fontScale }: { fontScale: number }) {
  return (
    <View style={styles.field}>
      <Skeleton width="40%" height={typography.label.lineHeight * fontScale} tone="surface" />
      <Skeleton width="100%" height={layout.inputHeight} radius={radii.input} tone="surface" />
      <Skeleton width="60%" height={typography.caption.lineHeight * fontScale} tone="surface" />
    </View>
  );
}

const styles = StyleSheet.create({
  blocks: {
    gap: spacing.xxl,
  },
  fields: {
    gap: spacing.md,
  },
  field: {
    gap: spacing.xs,
  },
});
