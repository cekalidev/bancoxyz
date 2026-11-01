import { useEffect } from 'react';

import { balanceErrorMessage, isSessionExpired, selectBalanceView } from '@/features/home';
import { useAsync } from '@/hooks/useAsync';
import { getBalance } from '@/services/api/balance';

// El saldo del formulario se pide una sola vez al montar: ni al volver a la pantalla ni al volver la app.
// Un 401 no deja aviso propio: la sesión ya se cerró y la guarda lleva al login con el suyo.
export function useFormBalance() {
  const { data, error, pending, errorId, run } = useAsync(getBalance, { ignoreError: isSessionExpired });
  useEffect(() => {
    void run();
  }, [run]);

  const message = error !== null ? balanceErrorMessage(error) : null;
  // Sin saldo no hay nada que conservar: el aviso se borra al empezar y vuelve el skeleton.
  const retry = () => {
    void run({ clearError: true });
  };
  const retrying = pending && error !== null;

  return { view: selectBalanceView({ data, error }), data, message, errorId, retrying, retry };
}
