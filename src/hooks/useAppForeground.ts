import { useEffect, useLayoutEffect, useRef } from 'react';
import { AppState } from 'react-native';

// Avisa cuando la app pasa de segundo plano a activa. El estado inactivo momentáneo de iOS
// (centro de control, llamada entrante) ni marca ni desmarca: solo cuenta haber pasado por `background`.
// La marca se consume al volver a activa aunque `enabled` sea falso, para no avisar más tarde por una vuelta antigua.
export function useAppForeground(onForeground: () => void, enabled: boolean): void {
  const onForegroundRef = useRef(onForeground);
  const enabledRef = useRef(enabled);
  useLayoutEffect(() => {
    onForegroundRef.current = onForeground;
    enabledRef.current = enabled;
  });

  useEffect(() => {
    let wentToBackground = false;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        wentToBackground = true;
        return;
      }
      if (state !== 'active' || !wentToBackground) return;
      wentToBackground = false;
      if (enabledRef.current) onForegroundRef.current();
    });
    return () => subscription.remove();
  }, []);
}
