import { LinearGradient } from 'expo-linear-gradient';
import type { RefObject } from 'react';
import { StyleSheet, Text, useWindowDimensions, View, type ViewInstance } from 'react-native';

import { BalanceEyeButton } from '@/features/home/components/BalanceEyeButton';
import type { Balance } from '@/services/api/types';
import { colors, gradients, layout, radii, spacing, typography } from '@/theme';
import { formatMoney, maskedMoney } from '@/utils/money';
import { spokenMoney } from '@/utils/spokenMoney';

// «US$ 1.234.567,89» con la fuente al 130 % necesita ≈ 0,61 para caber en 360 dp de ancho.
const MINIMUM_FONT_SCALE = 0.5;

type BalanceCardProps = {
  balance: Balance;
  // Se expone al padre para devolver el foco del lector a la tarjeta tras un reintento.
  cardRef: RefObject<ViewInstance | null>;
  hidden: boolean;
  onToggleHidden: () => void;
};

// Tarjeta del saldo: etiqueta y cifra forman un solo elemento accesible sobre el degradado de marca.
// El ojo va después en el árbol para que el lector lo recorra justo tras la tarjeta.
// La cifra encoge para caber en una línea y su contenedor fija el alto mínimo, así visible y oculta miden lo mismo.
export function BalanceCard({ balance, cardRef, hidden, onToggleHidden }: BalanceCardProps) {
  const { amount, currency } = balance;
  const { fontScale } = useWindowDimensions();
  const spoken = hidden ? 'oculto' : spokenMoney(amount, currency);

  return (
    <View style={styles.card}>
      <LinearGradient testID="balance-card-gradient" {...gradients.brand} style={StyleSheet.absoluteFill} />
      <View
        ref={cardRef}
        accessible
        accessibilityLabel={`Saldo disponible: ${spoken}`}
        style={styles.content}
      >
        <Text style={styles.label}>Saldo disponible</Text>
        <View style={{ minHeight: typography.stat.lineHeight * fontScale }}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={MINIMUM_FONT_SCALE}
            style={styles.amount}
          >
            {hidden ? maskedMoney(currency) : formatMoney(amount, currency)}
          </Text>
        </View>
      </View>
      <BalanceEyeButton hidden={hidden} onToggleHidden={onToggleHidden} style={styles.eye} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  content: {
    padding: spacing.xl,
    gap: spacing.xs,
  },
  eye: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  label: {
    ...typography.body,
    color: colors.textOnBrand,
    paddingRight: layout.minTouch,
  },
  amount: {
    ...typography.stat,
    color: colors.textOnBrand,
  },
});
