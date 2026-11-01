import { useSessionStore } from './sessionStore';

export function subscribeToSessionEnd(onEnd: () => void): () => void {
  return useSessionStore.subscribe((state, previous) => {
    if (previous.session && !state.session) onEnd();
  });
}
