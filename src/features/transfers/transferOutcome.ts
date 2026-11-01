import { ApiError } from '@/services/api/errors';
import type { NewTransfer } from '@/services/api/types';
import { centsToAmount } from '@/utils/amountInput';
import { isSameDate, type CalendarDate } from '@/utils/date';

import type { TransferDraft, TransferOutcome } from './types';

export function transferOutcome(
  error: unknown,
  date: CalendarDate,
  today: CalendarDate,
): TransferOutcome {
  if (error === null) {
    return isSameDate(date, today) ? 'immediate' : 'scheduled';
  }

  if (error instanceof ApiError && error.kind === 'badRequest') {
    return 'rejected';
  }

  if (error instanceof ApiError && error.kind === 'unauthorized') {
    return 'expired';
  }

  return 'uncertain';
}

export function toNewTransfer(draft: TransferDraft): NewTransfer {
  return {
    amount: centsToAmount(draft.cents),
    currency: draft.currency,
    payeeDocument: draft.document,
    date: draft.date,
  };
}
