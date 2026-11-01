import { INITIAL_TRANSFER_STATE, useTransferStore } from './transferStore';
import type { TransferAttempt, TransferDraft } from './types';

const RETENTION_MS = 10 * 60 * 1000;

export function startNewDraft(): void {
  useTransferStore.setState({ draft: null, lastAttempt: null });
}

export function setDraft(draft: TransferDraft): void {
  useTransferStore.setState({ draft });
}

export function setSending(sending: boolean): void {
  useTransferStore.setState({ sending });
}

export function finishAttempt(attempt: TransferAttempt): void {
  const oldest = Date.now() - RETENTION_MS;
  useTransferStore.setState((state) => ({
    sending: false,
    lastAttempt: attempt,
    attempts: [...state.attempts, attempt].filter(({ finishedAt }) => finishedAt >= oldest),
  }));
}

export function flagStaleDate(): void {
  useTransferStore.setState({ staleDateNotice: true });
}

export function consumeStaleDate(): boolean {
  const flagged = useTransferStore.getState().staleDateNotice;
  if (flagged) useTransferStore.setState({ staleDateNotice: false });
  return flagged;
}

export function resetTransfers(): void {
  useTransferStore.setState(INITIAL_TRANSFER_STATE);
}
