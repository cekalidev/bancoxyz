import { applyAmountInput, formatCents } from '@/utils/amountInput';

import type { AmountBounds, BoundField } from './types';

export const RANGE_ERROR = '«Desde» no puede ser mayor que «Hasta».';

export function rangeError({ min, max }: AmountBounds): string | null {
  const bothDefined = min !== null && max !== null;

  return bothDefined && min > max ? RANGE_ERROR : null;
}

export type AmountDraft = {
  texts: Record<BoundField, string>;
  submitted: boolean;
  error: string | null;
};

function centsFromText(text: string): number | null {
  return applyAmountInput('', text).cents;
}

function textFromCents(cents: number | null): string {
  return cents === null ? '' : formatCents(cents);
}

export function boundsFromTexts(texts: Record<BoundField, string>): AmountBounds {
  return { min: centsFromText(texts.from), max: centsFromText(texts.to) };
}

export function textsFromBounds({ min, max }: AmountBounds): Record<BoundField, string> {
  return { from: textFromCents(min), to: textFromCents(max) };
}

export function draftFromBounds(applied: AmountBounds): AmountDraft {
  return { texts: textsFromBounds(applied), submitted: false, error: null };
}

function withTexts(draft: AmountDraft, texts: Record<BoundField, string>): AmountDraft {
  const error = draft.submitted ? rangeError(boundsFromTexts(texts)) : draft.error;

  return { ...draft, texts, error };
}

export function changeBound(draft: AmountDraft, field: BoundField, text: string): AmountDraft {
  const masked = applyAmountInput(draft.texts[field], text).text;

  return withTexts(draft, { ...draft.texts, [field]: masked });
}

export type SubmitResult = { draft: AmountDraft; bounds: AmountBounds | null };

export function submitDraft(draft: AmountDraft): SubmitResult {
  const bounds = boundsFromTexts(draft.texts);
  const error = rangeError(bounds);

  return { draft: { ...draft, submitted: true, error }, bounds: error === null ? bounds : null };
}

export function clearBound(draft: AmountDraft, field: BoundField): AmountDraft {
  return withTexts(draft, { ...draft.texts, [field]: '' });
}
