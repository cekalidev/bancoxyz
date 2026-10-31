import { useEffect, useState } from 'react';
import { Animated, type DimensionValue, Easing, StyleSheet } from 'react-native';

import { useReducedMotionSetting } from '@/components/useReducedMotion';
import { colors, motion, radii } from '@/theme';

type SkeletonProps = { width: DimensionValue; height: number; tone: 'onBrand' };

const HALF_PULSE = motion.skeletonPulse / 2;
const easing = Easing.bezier(...motion.easing);

function pulseTo(value: Animated.Value, toValue: number) {
  return Animated.timing(value, { toValue, duration: HALF_PULSE, easing, useNativeDriver: true });
}

// Pulso de opacidad que solo arranca cuando se sabe que no hay reducción de movimiento.
function usePulse() {
  const reducedMotion = useReducedMotionSetting();
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (reducedMotion !== false) return;
    const pulse = Animated.loop(
      Animated.sequence([pulseTo(opacity, motion.skeletonMinOpacity), pulseTo(opacity, 1)]),
    );
    pulse.start();
    return () => {
      pulse.stop();
      opacity.setValue(1);
    };
  }, [reducedMotion, opacity]);

  return opacity;
}

// Bloque decorativo de carga; el grupo que lo contiene es quien se anuncia.
export function Skeleton({ width, height }: SkeletonProps) {
  const opacity = usePulse();

  return (
    <Animated.View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.block, { width, height, opacity }]}
    />
  );
}

const styles = StyleSheet.create({
  block: {
    borderRadius: radii.skeleton,
    backgroundColor: colors.skeletonOnBrand,
  },
});
