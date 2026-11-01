import { router } from 'expo-router';

import { finishAttempt, setSending } from './transferActions';
import type { TransferDraft, TransferOutcome } from './types';

export type SettleContext = {
  draft: TransferDraft;
  // Levanta el bloqueo de salida antes de navegar: `sending` aún no se ha vuelto a pintar.
  disablePrevention: () => void;
  // Muestra el aviso del rechazo en la confirmación, si sigue montada.
  onRejected: () => void;
  // Permite volver a confirmar.
  release: () => void;
};

// Con un resultado terminado se guarda el intento y se abre el resultado sobre el Inicio:
// la pila queda [Inicio, Resultado], así que atrás desde el resultado vuelve al Inicio.
// Un rechazo no deja intento: se sigue en la confirmación con el aviso y el reintento libre.
// Con la sesión caducada no se hace nada: el store ya se borró y la guarda lleva al login.
export function settleOutcome(outcome: TransferOutcome, context: SettleContext): void {
  const { draft, disablePrevention, onRejected, release } = context;
  switch (outcome) {
    case 'immediate':
    case 'scheduled':
    case 'uncertain':
      finishAttempt({ draft, outcome, finishedAt: Date.now() });
      disablePrevention();
      router.dismissAll();
      router.push('/nueva-transferencia/resultado');
      return;
    case 'rejected':
      setSending(false);
      onRejected();
      release();
      return;
    case 'expired':
      return;
  }
}
