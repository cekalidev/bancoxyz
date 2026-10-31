import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Skeleton } from '@/components/Skeleton';
import { gradients, radii, spacing, typography } from '@/theme';

// Carga de la tarjeta del saldo: misma forma que la tarjeta, se anuncia como un solo grupo ocupado y sin ojo.
export function BalanceCardSkeleton() {
  const { fontScale } = useWindowDimensions();

  return (
    <View
      accessible
      accessibilityLabel="Cargando…"
      accessibilityState={{ busy: true }}
      style={styles.card}
    >
      <LinearGradient
        testID="balance-skeleton-gradient"
        {...gradients.brand}
        style={StyleSheet.absoluteFill}
      />
      <View
        testID="balance-skeleton-blocks"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={styles.blocks}
      >
        <Skeleton width="60%" height={typography.body.lineHeight * fontScale} tone="onBrand" />
        <Skeleton width="80%" height={typography.stat.lineHeight * fontScale} tone="onBrand" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    overflow: 'hidden',
    padding: spacing.xl,
  },
  blocks: {
    gap: spacing.xs,
  },
});
