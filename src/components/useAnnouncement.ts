import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

type Snapshot = { message: string | null; repeatKey: number };

// En Android la región viva anuncia los cambios de texto; solo hace falta anunciar
// a mano cuando el mismo mensaje se repite con otra clave, porque la región no ve cambio.
function shouldAnnounce(previous: Snapshot, current: Snapshot) {
  if (!current.message) return false;
  const sameMessage = previous.message === current.message;
  const keyChanged = previous.repeatKey !== current.repeatKey;
  if (Platform.OS === 'ios') return !sameMessage || keyChanged;
  return sameMessage && keyChanged;
}

export function useAnnouncement(message: string | null, repeatKey = 0) {
  // Valores del render previo; en el montaje no hay mensaje anterior.
  const previous = useRef<Snapshot>({ message: null, repeatKey });

  useEffect(() => {
    const current = { message, repeatKey };
    if (current.message && shouldAnnounce(previous.current, current)) {
      AccessibilityInfo.announceForAccessibility(current.message);
    }
    previous.current = current;
  }, [message, repeatKey]);
}
