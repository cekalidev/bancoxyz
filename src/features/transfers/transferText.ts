import { centsToAmount } from '@/utils/amountInput';
import { formatDisplayDate, isSameDate, type CalendarDate } from '@/utils/date';
import { documentKind, formatDocument } from '@/utils/document';
import { spokenDate } from '@/utils/spokenDate';
import { spokenMoney } from '@/utils/spokenMoney';

import type { TransferDraft } from './types';

export function documentLabel(digits: string): string {
  const kind = documentKind(digits);
  const masked = formatDocument(digits);

  return kind === null ? masked : `${kind} ${masked}`;
}

export function confirmDateText(date: CalendarDate, today: CalendarDate): string {
  const text = formatDisplayDate(date);

  return isSameDate(date, today) ? `Hoy, ${text}` : `Programada para el ${text}`;
}

export function formDateText(date: CalendarDate, today: CalendarDate): string {
  const text = formatDisplayDate(date);

  return isSameDate(date, today) ? `Hoy, ${text}` : text;
}

export function formDateSpoken(date: CalendarDate, today: CalendarDate): string {
  const spoken = spokenDate(date);

  return `Fecha de la transferencia: ${isSameDate(date, today) ? `hoy, ${spoken}` : spoken}`;
}

export function spokenSummary(draft: TransferDraft, today: CalendarDate): string {
  const money = spokenMoney(centsToAmount(draft.cents), draft.currency);
  const spoken = spokenDate(draft.date);
  const when = isSameDate(draft.date, today) ? `hoy, ${spoken}` : `programada para el ${spoken}`;

  return `Vas a transferir ${money} al ${documentLabel(draft.document)}, ${when}`;
}

export const REJECTED_MESSAGE =
  'No pudimos hacer la transferencia. Revisa los datos e inténtalo de nuevo.';

export function duplicateMessage(minutes: number): string {
  return `Ya enviaste una transferencia igual hace ${minutes} min. ¿Quieres enviar otra?`;
}
