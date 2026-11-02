import { isFiniteNumber, isNonEmptyString, isRecord } from '@/services/api/guards';
import type { Session } from '@/services/api/types';

export type StoredSessionResult =
  { status: 'valid'; session: Session } | { status: 'empty' } | { status: 'damaged' };

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function toSession(value: unknown): Session | null {
  if (!isRecord(value) || !isNonEmptyString(value.token) || !isRecord(value.user)) return null;
  const { id, name, email } = value.user;
  if (!isFiniteNumber(id) || !isNonEmptyString(name) || !isNonEmptyString(email)) return null;
  return { token: value.token, user: { id, name, email } };
}

export function parseStoredSession(raw: string | null): StoredSessionResult {
  if (raw === null) return { status: 'empty' };
  const session = toSession(parseJson(raw));
  return session ? { status: 'valid', session } : { status: 'damaged' };
}
