import { useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback } from 'react';

import { useAppForeground } from '@/hooks/useAppForeground';
import type { RunOutcome } from '@/hooks/useAsync';

// Único disparador al entrar y al volver: un efecto de montaje aparte duplicaría la petición.
// La vuelta del segundo plano solo pide con el Inicio delante; con otra pantalla, ya pedirá el foco al volver.
export function useBalanceTriggers(run: () => Promise<RunOutcome>) {
  useFocusEffect(
    useCallback(() => {
      void run();
    }, [run]),
  );
  useAppForeground(() => void run(), useIsFocused());
}
