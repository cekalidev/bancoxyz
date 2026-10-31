import { useCallback, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export type BalanceVisibility = { hidden: boolean; toggle: () => void };

// Estado local del Inicio: las recargas no lo tocan y nunca se guarda.
export function useBalanceVisibility(): BalanceVisibility {
  const [hidden, setHidden] = useState(false);
  // Copia síncrona del valor: dos toques seguidos no leen un estado aún sin pintar
  // y el anuncio queda fuera del actualizador, que el modo estricto ejecuta dos veces.
  const hiddenRef = useRef(false);

  const toggle = useCallback(() => {
    const next = !hiddenRef.current;
    hiddenRef.current = next;
    setHidden(next);
    // No hay región que se anuncie sola para este cambio: se anuncia a mano en ambas plataformas.
    AccessibilityInfo.announceForAccessibility(next ? 'Saldo oculto' : 'Saldo visible');
  }, []);

  return { hidden, toggle };
}
