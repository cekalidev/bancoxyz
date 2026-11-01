import { subscribeToSessionEnd } from '@/features/auth';

import { resetTransfers } from './transferActions';

let connected = false;

export function connectTransfersToSession(): void {
  if (connected) return;
  connected = true;
  subscribeToSessionEnd(resetTransfers);
}
