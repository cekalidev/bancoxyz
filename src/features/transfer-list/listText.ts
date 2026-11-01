import type { Transfer } from '@/services/api/types';

const SINGULAR = 'transferencia';
const PLURAL = 'transferencias';

export function counterText(visible: number, total: number, filtering: boolean): string {
  const noun = total === 1 ? SINGULAR : PLURAL;

  return filtering ? `${visible} de ${total} ${noun}` : `${total} ${noun}`;
}

export function sharedCurrency(transfers: Transfer[]): string | null {
  const [first] = transfers;

  if (first === undefined) {
    return null;
  }

  const allShare = transfers.every((transfer) => transfer.currency === first.currency);

  return allShare ? first.currency : null;
}

export const NO_TRANSFERS_TITLE = 'Aún no tienes transferencias';
export const NO_TRANSFERS_TEXT = 'Cuando hagas una, aparecerá aquí.';
export const NEW_TRANSFER_LABEL = 'Nueva transferencia';

export const NO_RESULTS_TITLE = 'Sin resultados para estos filtros';
export const NO_RESULTS_TEXT = 'Prueba con otro nombre, valor o fecha';
export const CLEAR_FILTERS_LABEL = 'Limpiar filtros';
