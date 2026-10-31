import { configureApi } from '@/services/api/client';

import { expireSession } from './sessionActions';
import { useSessionStore } from './sessionStore';

export function connectApiToSession(): void {
  configureApi({
    getToken: () => useSessionStore.getState().session?.token ?? null,
    onUnauthorized: expireSession,
  });
}
