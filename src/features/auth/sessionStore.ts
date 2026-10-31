import { create } from 'zustand';

import type { Session } from '@/services/api/types';

export type SessionState = { session: Session | null; expiredEmail: string | null };

export const INITIAL_SESSION_STATE: SessionState = { session: null, expiredEmail: null };

export const useSessionStore = create<SessionState>()(() => INITIAL_SESSION_STATE);

export function useHasSession(): boolean {
  return useSessionStore((state) => state.session !== null);
}

export function useExpiredEmail(): string | null {
  return useSessionStore((state) => state.expiredEmail);
}

export function useUserName(): string {
  return useSessionStore((state) => state.session?.user.name ?? '');
}
