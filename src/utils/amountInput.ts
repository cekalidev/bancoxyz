import { formatAmountParts } from './money';

const MAX_SIGNIFICANT_DIGITS = 12;

export type AmountInput = { text: string; cents: number | null };

export function formatCents(cents: number): string {
  return formatAmountParts(cents / 100).digits;
}

export function applyAmountInput(previousText: string, nextText: string): AmountInput {
  const digits = nextText.replace(/\D/g, '');

  if (digits === '') {
    return { text: '', cents: null };
  }

  const significant = digits.replace(/^0+/, '').slice(0, MAX_SIGNIFICANT_DIGITS);

  if (significant === '') {
    const isDeletion = nextText.length < previousText.length;

    return isDeletion ? { text: '', cents: null } : { text: formatCents(0), cents: 0 };
  }

  const cents = Number(significant);

  return { text: formatCents(cents), cents };
}

export function truncateToCents(amount: number): number {
  return Math.floor(Math.round(amount * 1e6) / 1e4);
}

export function centsToAmount(cents: number): number {
  return cents / 100;
}
