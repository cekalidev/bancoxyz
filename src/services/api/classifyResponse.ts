import type { ApiErrorKind } from './errors';

const STATUS_OK = 200;
const STATUS_BAD_REQUEST = 400;
const STATUS_UNAUTHORIZED = 401;

export function classifyStatus(status: number, authenticated: boolean): ApiErrorKind | null {
  if (status === STATUS_OK) return null;
  if (status === STATUS_BAD_REQUEST) return 'badRequest';
  if (status === STATUS_UNAUTHORIZED) return authenticated ? 'unauthorized' : 'invalidCredentials';
  return 'unknown';
}
