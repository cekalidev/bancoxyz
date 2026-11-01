import { expireSession, signIn, signOut } from '@/features/auth/sessionActions';
import { INITIAL_SESSION_STATE, useSessionStore } from '@/features/auth/sessionStore';
import type { Session } from '@/services/api/types';

import { connectTransfersToSession } from './connectTransfers';
import { INITIAL_TRANSFER_STATE, useTransferStore } from './transferStore';
import type { TransferAttempt, TransferDraft } from './types';

const session: Session = {
  token: 'token-de-prueba',
  user: { id: 7, name: 'Ana Prueba', email: 'ana@ejemplo.com' },
};

const draft: TransferDraft = {
  cents: 15050,
  currency: 'USD',
  document: '12345678900',
  date: { year: 2026, month: 10, day: 31 },
};

const attempt: TransferAttempt = { draft, outcome: 'uncertain', finishedAt: 1_000 };

beforeEach(() => {
  useSessionStore.setState(INITIAL_SESSION_STATE, true);
  useTransferStore.setState(INITIAL_TRANSFER_STATE, true);
});

afterEach(jest.restoreAllMocks);

it('al cerrarse la sesión borra borrador, intentos y último resultado', () => {
  connectTransfersToSession();

  for (const endSession of [signOut, expireSession]) {
    signIn(session);
    useTransferStore.setState({
      draft,
      sending: true,
      lastAttempt: attempt,
      attempts: [attempt],
      staleDateNotice: true,
    });

    endSession();

    expect(useTransferStore.getState()).toStrictEqual(INITIAL_TRANSFER_STATE);
  }
});

it('conectar dos veces no suscribe dos veces', () => {
  connectTransfersToSession();
  connectTransfersToSession();
  signIn(session);
  useTransferStore.setState({ draft, attempts: [attempt] });
  const onChange = jest.fn();
  const unsubscribe = useTransferStore.subscribe(onChange);

  signOut();
  unsubscribe();

  expect(onChange).toHaveBeenCalledTimes(1);
});
