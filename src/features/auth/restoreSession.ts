import { markLoggedIn } from '@/services/api/client';
import { clearStoredSession, readStoredSession } from '@/services/storage/sessionStorage';
import { parseStoredSession, type StoredSessionResult } from '@/services/storage/storedSession';
import { settleWithin } from '@/utils/settleWithin';

import { useSessionStore } from './sessionStore';

const RESTORE_TIMEOUT_MS = 3000;

const DAMAGED: StoredSessionResult = { status: 'damaged' };
const TIMED_OUT: { status: 'timedOut' } = { status: 'timedOut' };

function readSessionResult(): Promise<StoredSessionResult> {
  return readStoredSession().then(parseStoredSession, () => DAMAGED);
}

// Never rejects. Damaged data is deleted here, not while reading, so a late read can never
// delete a session started afterwards. A read that times out deletes nothing: the next launch retries it.
export async function restoreSession(): Promise<void> {
  const result = await settleWithin(readSessionResult(), RESTORE_TIMEOUT_MS, TIMED_OUT);
  if (result.status === 'damaged') {
    void clearStoredSession();
    return;
  }
  if (result.status !== 'valid') return;
  // A restored session is a new session: it re-arms the expiry notice.
  markLoggedIn();
  useSessionStore.setState({ session: result.session });
}
