import type { Transfer } from '@/services/api/types';
import { compareDates, formatDisplayDate } from '@/utils/date';
import type { CalendarDate } from '@/utils/date';
import { formatDocument } from '@/utils/document';
import { formatMoney } from '@/utils/money';
import { spokenDate } from '@/utils/spokenDate';
import { spokenMoney } from '@/utils/spokenMoney';

import type { IndexedTransfer, TransferRow } from './types';

const CPF_DIGITS = 11;
const CNPJ_DIGITS = 14;

export function documentText(raw: string): string {
  const digits = raw.replace(/\D/g, '');

  if (digits.length === CPF_DIGITS) return `CPF ${formatDocument(digits)}`;
  if (digits.length === CNPJ_DIGITS) return `CNPJ ${formatDocument(digits)}`;
  return `Documento ${raw}`;
}

function spokenLabelOf(transfer: Transfer, scheduled: boolean): string {
  const parts = [
    `Transferencia a ${transfer.payeeName}`,
    documentText(transfer.payeeDocument),
    spokenMoney(transfer.amount, transfer.currency),
    spokenDate(transfer.date),
  ];

  if (scheduled) parts.push('programada');
  return parts.join(', ');
}

export function toTransferRow(
  { transfer, receivedIndex }: IndexedTransfer,
  today: CalendarDate,
): TransferRow {
  const scheduled = compareDates(transfer.date, today) === 1;

  return {
    key: String(receivedIndex),
    name: transfer.payeeName,
    detail: `${documentText(transfer.payeeDocument)} · ${formatDisplayDate(transfer.date)}`,
    amount: formatMoney(transfer.amount, transfer.currency),
    scheduled,
    spokenLabel: spokenLabelOf(transfer, scheduled),
  };
}
