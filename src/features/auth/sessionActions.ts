import { markLoggedOut } from '@/services/api/client';
import type { Session } from '@/services/api/types';
import { clearStoredSession, writeStoredSession } from '@/services/storage/sessionStorage';

import { INITIAL_SESSION_STATE, useSessionStore } from './sessionStore';

export function signIn(session: Session): void {
  useSessionStore.setState({ session, expiredEmail: null });
  // The app does not wait for the encrypted save; if it fails the session lives only in memory.
  void writeStoredSession(session).catch(() => undefined);
}

export function signOut(): void {
  markLoggedOut();
  useSessionStore.setState(INITIAL_SESSION_STATE);
  void clearStoredSession();
}

export function expireSession(): void {
  const { session } = useSessionStore.getState();
  if (!session) return;
  markLoggedOut();
  useSessionStore.setState({ session: null, expiredEmail: session.user.email });
  void clearStoredSession();
}

export function dismissExpiredNotice(): void {
  useSessionStore.setState({ expiredEmail: null });
}
