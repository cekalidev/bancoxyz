import { useEffect } from 'react';

import { useNavigateOnce } from '@/hooks/useNavigateOnce';
import type { Balance } from '@/services/api/types';
import { todayLocal } from '@/utils/date';

import { focusFirstError } from './focusFirstError';
import { setDraft, startNewDraft } from './transferActions';
import { useStaleDateReturn } from './useStaleDateReturn';
import { useTransferFields } from './useTransferFields';
import { validateTransfer } from './validateTransfer';

// Valida al pulsar «Continuar» con el día local de ese momento y el tope del saldo recibido.
// Con todo válido guarda el borrador y abre la confirmación; desde aquí nunca se envía.
// Al montar descarta el borrador y el último resultado: cada formulario empieza una transferencia nueva.
export function useTransferForm(balance: Balance) {
  const fields = useTransferFields(balance);
  const navigateOnce = useNavigateOnce();
  useStaleDateReturn(fields);
  useEffect(startNewDraft, []);

  function submit(): void {
    const today = todayLocal();
    fields.setToday(today);
    const { cents, document, date } = fields.values;
    const found = validateTransfer(fields.values, { capCents: fields.capCents, today });
    fields.setErrors(found);
    if (Object.keys(found).length > 0 || cents === null) {
      focusFirstError(found, fields.refs);
      return;
    }
    setDraft({ cents, currency: balance.currency, document, date });
    navigateOnce('/nueva-transferencia/confirmar');
  }

  return { fields, submit };
}
