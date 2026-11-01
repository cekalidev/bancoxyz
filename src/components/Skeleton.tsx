import { useEffect, useState } from 'react';
import { Animated, type DimensionValue, Easing, StyleSheet, View } from 'react-native';

import { useReducedMotionSetting } from '@/components/useReducedMotion';
import { colors, motion, radii } from '@/theme';

type SkeletonShape = { width: DimensionValue; height: number; radius?: number };
type SkeletonProps = SkeletonShape & { tone: 'onBrand' | 'surface' };

const HALF_PULSE = motion.skeletonPulse / 2;
const easing = Easing.bezier(...motion.easing);

function pulseTo(value: Animated.Value, toValue: number) {
  return Animated.timing(value, { toValue, duration: HALF_PULSE, easing, useNativeDriver: true });
}

// Pulso entre `from` y `to` que solo arranca cuando se sabe que no hay reducción de movimiento.
function usePulse(from: number, to: number) {
  const reducedMotion = useReducedMotionSetting();
  const [value] = useState(() => new Animated.Value(from));

  useEffect(() => {
    if (reducedMotion !== false) return;
    const pulse = Animated.loop(Animated.sequence([pulseTo(value, to), pulseTo(value, from)]));
    pulse.start();
    return () => {
      pulse.stop();
      value.setValue(from);
    };
  }, [reducedMotion, value, from, to]);

  return value;
}

const hiddenFromReader = {
  accessible: false,
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

// Bloque decorativo de carga; el grupo que lo contiene es quien se anuncia.
export function Skeleton({ tone, ...shape }: SkeletonProps) {
  return tone === 'surface' ? <SurfaceBlock {...shape} /> : <OnBrandBlock {...shape} />;
}

// Sobre el degradado de marca: el propio bloque pulsa su opacidad.
function OnBrandBlock({ width, height, radius = radii.skeleton }: SkeletonShape) {
  const opacity = usePulse(1, motion.skeletonMinOpacity);

  return (
    <Animated.View
      {...hiddenFromReader}
      style={[styles.onBrand, { width, height, borderRadius: radius, opacity }]}
    />
  );
}

// Sobre una superficie clara: el bloque es el color base y una capa de realce encima pulsa su opacidad.
function SurfaceBlock({ width, height, radius = radii.skeleton }: SkeletonShape) {
  const opacity = usePulse(0, 1);

  return (
    <View {...hiddenFromReader} style={[styles.surface, { width, height, borderRadius: radius }]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.highlight, { opacity }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  onBrand: {
    backgroundColor: colors.skeletonOnBrand,
  },
  surface: {
    overflow: 'hidden',
    backgroundColor: colors.skeletonBase,
  },
  highlight: {
    backgroundColor: colors.skeletonHighlight,
  },
});
