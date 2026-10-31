import { parseApiDate } from '@/utils/date';

import { request } from './client';
import { API_URLS } from './endpoints';
import { isCurrencyCode, isFiniteNumber, isNonEmptyString, isRecord } from './guards';
import type { Transfer } from './types';

function toTransfer(item: unknown): Transfer | null {
  if (!isRecord(item) || !isRecord(item.payeer)) return null;
  const { value, date, currency, payeer } = item;
  if (!isFiniteNumber(value) || !isCurrencyCode(currency) || typeof date !== 'string') return null;
  if (!isNonEmptyString(payeer.name) || !isNonEmptyString(payeer.document)) return null;
  const parsedDate = parseApiDate(date);
  if (!parsedDate) return null;
  return {
    payeeName: payeer.name,
    payeeDocument: payeer.document,
    amount: value,
    currency,
    date: parsedDate,
  };
}

function extractItems(json: unknown): unknown[] | null {
  if (Array.isArray(json)) return json;
  if (isRecord(json) && Array.isArray(json.transfers)) return json.transfers;
  return null;
}

function toTransfers(json: unknown): Transfer[] | null {
  const items = extractItems(json);
  if (!items) return null;
  const transfers: Transfer[] = [];
  for (const item of items) {
    const transfer = toTransfer(item);
    if (!transfer) return null;
    transfers.push(transfer);
  }
  return transfers;
}

export function getTransfers(): Promise<Transfer[]> {
  return request({ url: API_URLS.transferList, method: 'GET', authenticated: true, parse: toTransfers });
}
