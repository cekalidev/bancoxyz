import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useReducedMotion } from '@/components/useReducedMotion';
import { colors, gradients, layout, motion, radii, spacing, typography } from '@/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  busy?: boolean;
  busyLabel?: string;
  accessibilityLabel?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  busy = false,
  busyLabel,
  accessibilityLabel,
}: ButtonProps) {
  const reducedMotion = useReducedMotion();
  const text = busy ? (busyLabel ?? label) : label;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy }}
      disabled={busy}
      onPress={onPress}
      android_ripple={{ color: colors.ripple, foreground: true }}
      style={({ pressed }) => [
        variantStyles[variant],
        busy && styles.busy,
        pressed && styles.pressed,
        pressed && !reducedMotion && styles.pressedScale,
      ]}
    >
      {!busy && variant === 'primary' && (
        <LinearGradient testID="button-gradient" {...gradients.cta} style={StyleSheet.absoluteFill} />
      )}
      <Text style={[styles.label, labelStyles[variant], busy && styles.busyLabel]}>{text}</Text>
    </Pressable>
  );
}

const pill = {
  height: layout.buttonHeight,
  borderRadius: radii.pill,
  paddingHorizontal: spacing.xl,
  overflow: 'hidden',
  alignItems: 'center',
  justifyContent: 'center',
} as const;

const styles = StyleSheet.create({
  primary: pill,
  secondary: {
    ...pill,
    backgroundColor: colors.surfaceMuted,
  },
  ghost: {
    minHeight: layout.minTouch,
    minWidth: layout.minTouch,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  busy: {
    backgroundColor: colors.disabledBg,
  },
  pressed: {
    opacity: motion.pressedOpacity,
  },
  pressedScale: {
    transform: [{ scale: motion.pressedScale }],
  },
  label: typography.button,
  primaryLabel: {
    color: colors.textOnAccent,
  },
  secondaryLabel: {
    color: colors.text,
  },
  ghostLabel: {
    color: colors.textStrong,
  },
  busyLabel: {
    color: colors.disabledText,
  },
});

const variantStyles = {
  primary: styles.primary,
  secondary: styles.secondary,
  ghost: styles.ghost,
};

const labelStyles = {
  primary: styles.primaryLabel,
  secondary: styles.secondaryLabel,
  ghost: styles.ghostLabel,
};
