import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { AccessibilityInfo, type HostInstance } from 'react-native';

type FocusTarget = RefObject<HostInstance | null>;

// Devuelve `focusLater(ref)`: pide el foco del lector de pantalla para el nodo de `ref` en el
// siguiente fotograma, cuando el cambio de pantalla o de hoja ya terminó y el foco no se pierde.
// Solo queda un fotograma pendiente: pedir otro cancela el anterior, y desmontar cancela el último.
export function useFocusOnNextFrame(): (ref: FocusTarget) => void {
  const pendingFrame = useRef<number | null>(null);

  const cancelPendingFrame = useCallback(() => {
    if (pendingFrame.current !== null) cancelAnimationFrame(pendingFrame.current);
    pendingFrame.current = null;
  }, []);

  useEffect(() => cancelPendingFrame, [cancelPendingFrame]);

  return useCallback(
    (ref) => {
      cancelPendingFrame();
      pendingFrame.current = requestAnimationFrame(() => {
        pendingFrame.current = null;
        if (ref.current) AccessibilityInfo.sendAccessibilityEvent(ref.current, 'focus');
      });
    },
    [cancelPendingFrame],
  );
}
