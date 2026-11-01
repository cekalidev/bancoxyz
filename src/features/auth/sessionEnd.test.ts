import type { Session } from '@/services/api/types';

import { expireSession, signIn, signOut } from './sessionActions';
import { subscribeToSessionEnd } from './sessionEnd';
import { INITIAL_SESSION_STATE, useSessionStore } from './sessionStore';

const session: Session = {
  token: 'token-de-prueba',
  user: { id: 7, name: 'Ana Prueba', email: 'ana@ejemplo.com' },
};

const otherSession: Session = {
  token: 'otro-token',
  user: { id: 8, name: 'Luis Prueba', email: 'luis@ejemplo.com' },
};

beforeEach(() => {
  useSessionStore.setState(INITIAL_SESSION_STATE, true);
});

afterEach(jest.restoreAllMocks);

it('avisa cuando la sesión pasa a cerrada, también por caducidad, y no al iniciarla', () => {
  const onEnd = jest.fn();
  const unsubscribe = subscribeToSessionEnd(onEnd);

  signIn(session);
  signIn(otherSession);
  expect(onEnd).not.toHaveBeenCalled();

  signOut();
  expect(onEnd).toHaveBeenCalledTimes(1);

  signOut();
  expect(onEnd).toHaveBeenCalledTimes(1);

  signIn(session);
  expireSession();
  expect(onEnd).toHaveBeenCalledTimes(2);

  unsubscribe();
  signIn(session);
  signOut();
  expect(onEnd).toHaveBeenCalledTimes(2);
});
