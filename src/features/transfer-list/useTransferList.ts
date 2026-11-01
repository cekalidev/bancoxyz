import { balanceErrorMessage, isSessionExpired } from '@/features/home';
import { useAsync } from '@/hooks/useAsync';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';

import { selectListView } from './listView';
import { loadTransferList } from './loadTransferList';

// El 401 lo resuelve el cierre de sesión; aquí no se muestra como error del listado.
const LIST_OPTIONS = { ignoreError: isSessionExpired };

export function useTransferList() {
  const { data, error, pending, errorId, run } = useAsync(loadTransferList, LIST_OPTIONS);
  useRefreshOnFocus(run);
  const message = error !== null ? balanceErrorMessage(error) : null;
  // Sin datos, el aviso se borra al empezar para que vuelva el skeleton; con datos, sigue a la vista.
  const retry = () => void run({ clearError: data === undefined });
  // Con el aviso a la vista, la petición en curso deja «Reintentar» ocupado.
  const retrying = pending && error !== null;

  return { view: selectListView({ data, error }), snapshot: data, message, errorId, retrying, retry };
}
