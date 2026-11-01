import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

import { findRecentDuplicate } from './duplicateWarning';
import { duplicateMessage } from './transferText';
import { useTransferStore } from './transferStore';
import type { TransferDraft } from './types';

// Aviso de un intento igual terminado hace menos de diez minutos, o `null` si no lo hay.
// Se calcula una vez al montar la confirmación y no cambia mientras sigue abierta, aunque
// pase el tiempo o se registren otros intentos; volver a entrar la remonta y lo recalcula.
// Al entrar se anuncia una sola vez: en iOS lo hace el propio aviso al montarse; en Android
// la región viva no lee un texto que ya llega puesto, así que se anuncia aquí.
export function useDuplicateNotice(draft: TransferDraft): string | null {
  const [duplicate] = useState(() =>
    findRecentDuplicate(useTransferStore.getState().attempts, draft, Date.now()),
  );
  const message = duplicate ? duplicateMessage(duplicate.minutes) : null;

  useEffect(() => {
    if (message && Platform.OS === 'android') AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  return message;
}
