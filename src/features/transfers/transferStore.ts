import { create } from 'zustand';

import type { TransferAttempt, TransferDraft } from './types';

export type TransferState = {
  draft: TransferDraft | null;
  sending: boolean;
  lastAttempt: TransferAttempt | null;
  attempts: TransferAttempt[];
  staleDateNotice: boolean;
};

export const INITIAL_TRANSFER_STATE: TransferState = {
  draft: null,
  sending: false,
  lastAttempt: null,
  attempts: [],
  staleDateNotice: false,
};

export const useTransferStore = create<TransferState>()(() => INITIAL_TRANSFER_STATE);
