import { formatAmountParts } from './money';

type CurrencyName = Readonly<{ plural: string; singular: string }>;

const CURRENCY_NAMES: Readonly<Record<string, CurrencyName>> = {
  USD: { plural: 'dólares', singular: 'dólar' },
  BRL: { plural: 'reales', singular: 'real' },
  EUR: { plural: 'euros', singular: 'euro' },
};

export function currencyName(currency: string, singular: boolean): string {
  if (!Object.hasOwn(CURRENCY_NAMES, currency)) return currency;

  const names = CURRENCY_NAMES[currency];

  return singular ? names.singular : names.plural;
}

export function spokenMoney(amount: number, currency: string): string {
  const { negative, digits } = formatAmountParts(amount);

  return `${negative ? 'menos ' : ''}${digits} ${currencyName(currency, false)}`;
}
