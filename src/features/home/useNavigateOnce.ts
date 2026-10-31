import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useRef } from 'react';

// Abre un destino una sola vez aunque el botón se pulse varias veces seguidas.
// La guarda se libera cuando la pantalla vuelve a tener el foco, también en el foco inicial.
export function useNavigateOnce(): (href: Href) => void {
  const navigating = useRef(false);

  useFocusEffect(
    useCallback(() => {
      navigating.current = false;
    }, []),
  );

  return useCallback((href: Href) => {
    if (navigating.current) return;
    navigating.current = true;
    router.push(href);
  }, []);
}
