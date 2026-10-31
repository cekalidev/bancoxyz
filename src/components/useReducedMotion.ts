import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Preferencia del sistema de reducir el movimiento. Vale `null` mientras no se ha leído:
 * quien anima debe esperar a `false` antes de arrancar para no mostrar movimiento de más.
 */
export function useReducedMotionSetting(): boolean | null {
  const [reduced, setReduced] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduced(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}

export function useReducedMotion() {
  return useReducedMotionSetting() === true;
}
