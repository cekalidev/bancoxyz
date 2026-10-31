import { deleteItemAsync, getItemAsync, setItemAsync } from 'expo-secure-store';

import type { Session } from '@/services/api/types';

export const SESSION_KEY = 'bancoxyz.session';
export const CLOSED_MARKER = 'closed';

// Writes and deletes run one after another so a delete never overtakes a pending save.
let queue: Promise<void> = Promise.resolve();

function enqueue(operation: () => Promise<void>): Promise<void> {
  const result = queue.then(operation);
  queue = result.catch(() => undefined);
  return result;
}

function toStoredJson({ token, user }: Session): string {
  return JSON.stringify({ token, user: { id: user.id, name: user.name, email: user.email } });
}

export function readStoredSession(): Promise<string | null> {
  return getItemAsync(SESSION_KEY);
}

export function writeStoredSession(session: Session): Promise<void> {
  return enqueue(() => setItemAsync(SESSION_KEY, toStoredJson(session)));
}

async function deleteOrMarkClosed(): Promise<void> {
  try {
    await deleteItemAsync(SESSION_KEY);
  } catch {
    await setItemAsync(SESSION_KEY, CLOSED_MARKER).catch(() => undefined);
  }
}

export function clearStoredSession(): Promise<void> {
  return enqueue(deleteOrMarkClosed);
}
