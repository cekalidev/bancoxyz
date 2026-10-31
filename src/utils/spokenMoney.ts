import { formatAmountParts } from './money';

const SPOKEN_CURRENCIES: Readonly<Record<string, string>> = {
  USD: 'dólares',
  BRL: 'reales',
  EUR: 'euros',
};

export function spokenMoney(amount: number, currency: string): string {
  const { negative, digits } = formatAmountParts(amount);
  const name = Object.hasOwn(SPOKEN_CURRENCIES, currency) ? SPOKEN_CURRENCIES[currency] : currency;

  return `${negative ? 'menos ' : ''}${digits} ${name}`;
}
