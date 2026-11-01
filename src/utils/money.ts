const NO_BREAK_SPACE = '\u00a0';
const MASK = '••••••';

const CURRENCY_SYMBOLS: Readonly<Record<string, string>> = {
  AUD: 'AU$',
  BRL: 'R$',
  CAD: 'CA$',
  CNY: 'CN¥',
  EUR: '€',
  GBP: '£',
  HKD: 'HK$',
  ILS: '₪',
  INR: '₹',
  JPY: 'JP¥',
  KRW: '₩',
  MXN: 'MX$',
  NZD: 'NZ$',
  THB: '฿',
  TWD: 'NT$',
  USD: 'US$',
  VND: '₫',
  XAF: 'FCFA',
  XCD: 'EC$',
  XCG: 'Cg.',
  XOF: 'F\u202fCFA',
  XPF: 'CFPF',
};

export function currencySymbol(currency: string): string {
  return Object.hasOwn(CURRENCY_SYMBOLS, currency) ? CURRENCY_SYMBOLS[currency] : currency;
}

function toCents(amount: number): number {
  return Math.round(Number((Math.abs(amount) * 100).toPrecision(12)));
}

export function amountToCents(amount: number): number {
  const cents = toCents(amount);

  return amount < 0 && cents !== 0 ? -cents : cents;
}

function groupThousands(units: number): string {
  return String(units).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export type AmountParts = { negative: boolean; digits: string };

export function formatAmountParts(amount: number): AmountParts {
  if (!Number.isFinite(amount)) {
    throw new RangeError(`El importe debe ser un número finito: ${amount}`);
  }

  const cents = toCents(amount);
  const units = groupThousands(Math.floor(cents / 100));
  const decimals = String(cents % 100).padStart(2, '0');

  return { negative: amount < 0 && cents !== 0, digits: `${units},${decimals}` };
}

export function formatMoney(amount: number, currency: string): string {
  const { negative, digits } = formatAmountParts(amount);

  return `${negative ? '-' : ''}${currencySymbol(currency)}${NO_BREAK_SPACE}${digits}`;
}

export function maskedMoney(currency: string): string {
  return `${currencySymbol(currency)}${NO_BREAK_SPACE}${MASK}`;
}
