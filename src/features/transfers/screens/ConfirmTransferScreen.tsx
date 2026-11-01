import { useState } from 'react';

import { ConfirmTransferBody } from '../components/ConfirmTransferBody';
import { useTransferStore } from '../transferStore';
import { useRedirectWhenMissing } from '../useRedirectWhenMissing';

// Instantánea del borrador al montar: si la sesión termina, el store se vacía antes de que
// la pantalla se desmonte y el resumen no debe cambiar mientras tanto.
export function ConfirmTransferScreen() {
  const [draft] = useState(() => useTransferStore.getState().draft);
  useRedirectWhenMissing(draft, '/nueva-transferencia');

  if (draft === null) return null;
  return <ConfirmTransferBody draft={draft} />;
}
