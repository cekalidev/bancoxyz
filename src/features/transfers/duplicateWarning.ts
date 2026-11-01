import { toApiDate } from '@/utils/date';

import type { TransferAttempt, TransferDraft } from './types';

const MINUTE_MS = 60000;
const WINDOW_MS = 10 * MINUTE_MS;

export function sameTransfer(a: TransferDraft, b: TransferDraft): boolean {
  return (
    a.document === b.document &&
    a.cents === b.cents &&
    a.currency === b.currency &&
    toApiDate(a.date) === toApiDate(b.date)
  );
}

function wholeMinutesSince(finishedAt: number, now: number): number {
  return Math.max(1, Math.floor((now - finishedAt) / MINUTE_MS));
}

export function findRecentDuplicate(
  attempts: TransferAttempt[],
  draft: TransferDraft,
  now: number,
): { minutes: number } | null {
  const finishTimes = attempts
    .filter((attempt) => sameTransfer(attempt.draft, draft) && now - attempt.finishedAt < WINDOW_MS)
    .map((attempt) => attempt.finishedAt);

  return finishTimes.length === 0
    ? null
    : { minutes: wholeMinutesSince(Math.max(...finishTimes), now) };
}
