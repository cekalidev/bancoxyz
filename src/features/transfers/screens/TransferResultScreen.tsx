import { router } from 'expo-router';
import { useState } from 'react';

import { Screen } from '@/components/Screen';

import { TransferResult } from '../components/TransferResult';
import { useTransferStore } from '../transferStore';
import { useRedirectWhenMissing } from '../useRedirectWhenMissing';

// Instantánea del último intento al montar: si la sesión termina, el store se vacía antes de que
// la pantalla se desmonte y el resultado no debe cambiar mientras tanto. Sin intento, va al Inicio.
export function TransferResultScreen() {
  const [attempt] = useState(() => useTransferStore.getState().lastAttempt);
  useRedirectWhenMissing(attempt, '/');

  if (attempt === null) return null;
  return (
    <Screen scroll>
      <TransferResult attempt={attempt} onHome={() => router.dismissTo('/')} />
    </Screen>
  );
}
