import { router, usePreventRemove } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { createTransfer } from '@/services/api/transfer';
import { isBefore, todayLocal } from '@/utils/date';

import { settleOutcome } from './settleOutcome';
import { flagStaleDate, setSending } from './transferActions';
import { toNewTransfer, transferOutcome } from './transferOutcome';
import { useTransferStore } from './transferStore';
import type { TransferDraft } from './types';

// Una salida bloqueada durante el envío no hace nada: la pantalla sigue en «Transfiriendo…».
function ignoreBlockedLeave(): void {}

type Rejection = { shown: boolean; id: number };

function useMounted() {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
}

// «Hoy» se recalcula al confirmar: si la fecha del borrador ya pasó, no se envía y se vuelve
// al formulario avisándole de que la fecha caducó. La guarda es síncrona: los toques que llegan
// antes de que la pantalla vuelva a pintarse no envían otra transferencia. Mientras envía no se
// sale de la confirmación con atrás, el botón de la cabecera ni el gesto. Un rechazo deja el
// aviso en la confirmación y permite volver a intentarlo; cada rechazo lleva su propio id.
export function useSendTransfer(draft: TransferDraft) {
  const inFlight = useRef(false);
  const mounted = useMounted();
  const [rejection, setRejection] = useState<Rejection>({ shown: false, id: 0 });
  const sending = useTransferStore((state) => state.sending);
  const disablePrevention = usePreventRemove(sending, ignoreBlockedLeave);

  const onRejected = () => setRejection(({ id }) => ({ shown: true, id: id + 1 }));
  const release = () => {
    inFlight.current = false;
  };

  async function confirm(): Promise<void> {
    if (inFlight.current) return;
    setRejection(({ id }) => ({ shown: false, id }));
    const today = todayLocal();
    if (isBefore(draft.date, today)) {
      flagStaleDate();
      router.back();
      return;
    }
    inFlight.current = true;
    setSending(true);
    const error = await createTransfer(toNewTransfer(draft)).then(
      () => null,
      (reason: unknown) => reason,
    );
    // Si la confirmación ya se desmontó no hay pantalla que actualizar ni desde la que navegar.
    if (!mounted.current) return setSending(false);
    const context = { draft, disablePrevention, onRejected, release };
    settleOutcome(transferOutcome(error, draft.date, today), context);
  }

  return { confirm, sending, rejectedId: rejection.shown ? rejection.id : null };
}
