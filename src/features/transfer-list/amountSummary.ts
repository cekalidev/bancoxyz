import { formatCents } from '@/utils/amountInput';
import { currencySymbol } from '@/utils/money';
import { currencyName } from '@/utils/spokenMoney';

import type { AmountBounds } from './types';

const NO_BREAK_SPACE = ' ';
const EN_DASH = '–';
const ONE_UNIT_IN_CENTS = 100;
const NO_CENTS_SUFFIX = ',00';
const UNFILTERED_CHIP = 'Valor';
const UNFILTERED_LABEL = 'Filtro de valor: sin aplicar';

export function shortAmount(cents: number): string {
  const text = formatCents(cents);

  return text.endsWith(NO_CENTS_SUFFIX) ? text.slice(0, -NO_CENTS_SUFFIX.length) : text;
}

export function amountChipText(bounds: AmountBounds, currency: string | null): string {
  const { min, max } = bounds;
  const prefix = currency === null ? '' : `${currencySymbol(currency)}${NO_BREAK_SPACE}`;

  if (min !== null && max !== null) {
    return `${prefix}${shortAmount(min)}${EN_DASH}${shortAmount(max)}`;
  }
  if (min !== null) return `Desde ${prefix}${shortAmount(min)}`;
  if (max !== null) return `Hasta ${prefix}${shortAmount(max)}`;

  return UNFILTERED_CHIP;
}

function labelWording({ min, max }: AmountBounds): string | null {
  if (min !== null && max !== null) return `de ${shortAmount(min)} a ${shortAmount(max)}`;
  if (min !== null) return `desde ${shortAmount(min)}`;
  if (max !== null) return `hasta ${shortAmount(max)}`;

  return null;
}

export function amountChipLabel(bounds: AmountBounds, currency: string | null): string {
  const wording = labelWording(bounds);

  if (wording === null) return UNFILTERED_LABEL;

  const lastCents = bounds.max ?? bounds.min;
  const name = currency === null ? '' : ` ${currencyName(currency, lastCents === ONE_UNIT_IN_CENTS)}`;

  return `Filtro de valor: ${wording}${name}`;
}
