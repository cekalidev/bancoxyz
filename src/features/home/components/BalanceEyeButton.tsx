import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { EyeIcon } from '@/components/icons/EyeIcon';
import { EyeOffIcon } from '@/components/icons/EyeOffIcon';
import { colors, layout } from '@/theme';

type BalanceEyeButtonProps = {
  hidden: boolean;
  onToggleHidden: () => void;
  // Posición dentro de la tarjeta; el tamaño táctil lo fija el propio botón.
  style?: StyleProp<ViewStyle>;
};

// Un solo Pressable que solo cambia de props: el lector conserva el foco al alternar.
export function BalanceEyeButton({ hidden, onToggleHidden, style }: BalanceEyeButtonProps) {
  const Icon = hidden ? EyeOffIcon : EyeIcon;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hidden ? 'Mostrar saldo' : 'Ocultar saldo'}
      android_ripple={{ color: colors.ripple, foreground: true }}
      onPress={onToggleHidden}
      style={[styles.eye, style]}
    >
      <Icon color={colors.textOnBrand} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  eye: {
    width: layout.minTouch,
    height: layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
