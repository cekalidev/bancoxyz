import { ApiError, ERROR_MESSAGES } from '@/services/api/errors';
import type { Balance } from '@/services/api/types';

export type BalanceView = 'card' | 'error' | 'skeleton';

type BalanceState = { data: Balance | undefined; error: unknown };

export function selectBalanceView({ data, error }: BalanceState): BalanceView {
  if (data !== undefined) return 'card';
  return error !== null ? 'error' : 'skeleton';
}

export function balanceErrorMessage(error: unknown): string {
  const isNetwork = error instanceof ApiError && error.kind === 'network';
  return isNetwork ? ERROR_MESSAGES.network : ERROR_MESSAGES.unknown;
}

export function isSessionExpired(error: unknown): boolean {
  return error instanceof ApiError && error.kind === 'unauthorized';
}
