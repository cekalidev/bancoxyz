import type { CalendarDate } from '@/utils/date';

export type CurrencyCode = string;

export type User = { id: number; name: string; email: string };

export type Session = { token: string; user: User };

export type Balance = { amount: number; currency: CurrencyCode };

export type Transfer = {
  payeeName: string;
  payeeDocument: string;
  amount: number;
  currency: CurrencyCode;
  date: CalendarDate;
};

export type NewTransfer = {
  amount: number;
  currency: CurrencyCode;
  payeeDocument: string;
  date: CalendarDate;
};
