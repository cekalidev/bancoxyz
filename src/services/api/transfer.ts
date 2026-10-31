import { toApiDate } from '@/utils/date';

import { request } from './client';
import { API_URLS } from './endpoints';
import { isRecord } from './guards';
import type { NewTransfer } from './types';

function parseSuccess(json: unknown): true | null {
  return isRecord(json) && json.status === 'success' ? true : null;
}

export async function createTransfer(input: NewTransfer): Promise<void> {
  await request({
    url: API_URLS.transfer,
    method: 'POST',
    authenticated: true,
    body: {
      value: input.amount,
      currency: input.currency,
      payeerDocument: input.payeeDocument,
      transferDate: toApiDate(input.date),
    },
    parse: parseSuccess,
  });
}
