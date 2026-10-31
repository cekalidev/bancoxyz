import { useRef, useState } from 'react';

import { ApiError, ERROR_MESSAGES } from '@/services/api/errors';
import { login } from '@/services/api/login';

import { signIn } from './sessionActions';
import { normalizeEmail } from './validateLogin';

function messageFor(error: unknown): string {
  return error instanceof ApiError ? ERROR_MESSAGES[error.kind] : ERROR_MESSAGES.unknown;
}

export function useLoginSubmit() {
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const inFlight = useRef(false);

  async function send(email: string, password: string): Promise<void> {
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    try {
      signIn(await login(normalizeEmail(email), password));
    } catch (error) {
      setServerError(messageFor(error));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  const clearServerError = () => setServerError(null);

  return { send, submitting, serverError, clearServerError };
}
