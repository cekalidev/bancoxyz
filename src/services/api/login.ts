import { markLoggedIn, request } from './client';
import { API_URLS } from './endpoints';
import { isFiniteNumber, isNonEmptyString, isRecord } from './guards';
import type { Session, User } from './types';

function toUser(json: unknown): User | null {
  if (!isRecord(json)) return null;
  const { id, name, email } = json;
  if (!isFiniteNumber(id) || typeof name !== 'string' || typeof email !== 'string') return null;
  return { id, name, email };
}

function toSession(json: unknown): Session | null {
  if (!isRecord(json) || !isNonEmptyString(json.token)) return null;
  const user = toUser(json.user);
  return user ? { token: json.token, user } : null;
}

export async function login(email: string, password: string): Promise<Session> {
  const session = await request({
    url: API_URLS.login,
    method: 'POST',
    body: { email, password },
    authenticated: false,
    parse: toSession,
  });
  markLoggedIn();
  return session;
}
