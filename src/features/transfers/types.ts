import type { CalendarDate } from '@/utils/date';

export type TransferDraft = {
  cents: number;
  currency: string;
  document: string;
  date: CalendarDate;
};

export type FinishedOutcome = 'immediate' | 'scheduled' | 'uncertain';
export type TransferOutcome = FinishedOutcome | 'rejected' | 'expired';

export type TransferAttempt = {
  draft: TransferDraft;
  outcome: FinishedOutcome;
  finishedAt: number;
};

export type TransferField = 'amount' | 'document' | 'date';
export type TransferErrors = Partial<Record<TransferField, string>>;
