import { request } from './client';
import { API_URLS } from './endpoints';
import { isCurrencyCode, isFiniteNumber, isRecord } from './guards';
import type { Balance } from './types';

function toBalance(json: unknown): Balance | null {
  if (!isRecord(json)) return null;
  const { accountBalance, currency } = json;
  if (!isFiniteNumber(accountBalance) || !isCurrencyCode(currency)) return null;
  return { amount: accountBalance, currency };
}

export function getBalance(): Promise<Balance> {
  return request({ url: API_URLS.balance, method: 'GET', authenticated: true, parse: toBalance });
}
