import { useRef } from 'react';
import { AccessibilityInfo, type ViewInstance } from 'react-native';

import { useAsync } from '@/hooks/useAsync';
import { getBalance } from '@/services/api/balance';

import { balanceErrorMessage, isSessionExpired, selectBalanceView } from './balanceView';
import { useBalanceTriggers } from './useBalanceTriggers';

// El 401 lo resuelve el cierre de sesión; aquí no se muestra como error del saldo.
const BALANCE_OPTIONS = { ignoreError: isSessionExpired };

export type BalanceModel = ReturnType<typeof useBalance>;

export function useBalance() {
  const { data, error, pending, errorId, run } = useAsync(getBalance, BALANCE_OPTIONS);
  useBalanceTriggers(run);
  const cardRef = useRef<ViewInstance>(null);
  const message = error !== null ? balanceErrorMessage(error) : null;
  // Sin cifra, el aviso se borra al empezar para que vuelva el skeleton.
  // Con cifra, un reintento correcto lleva el foco del lector a la tarjeta.
  const retry = () => {
    const hadData = data !== undefined;
    void (async () => {
      const outcome = await run({ clearError: !hadData });
      if (outcome === 'success' && hadData && cardRef.current) {
        AccessibilityInfo.sendAccessibilityEvent(cardRef.current, 'focus');
      }
    })();
  };

  // Con el aviso a la vista, la petición en curso deja «Reintentar» ocupado.
  const retrying = pending && error !== null;

  return { view: selectBalanceView({ data, error }), balance: data, message, errorId, retrying, retry, cardRef };
}
