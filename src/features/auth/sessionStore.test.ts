import { act, renderHook } from '@testing-library/react-native';

import type { Session } from '@/services/api/types';

import { INITIAL_SESSION_STATE, useSessionStore, useUserName } from './sessionStore';

const session: Session = {
  token: 'token-de-prueba',
  user: { id: 7, name: 'Ana Prueba', email: 'ana@ejemplo.com' },
};

afterEach(() => {
  useSessionStore.setState(INITIAL_SESSION_STATE, true);
});

describe('useUserName', () => {
  it('devuelve el nombre de la sesión y vacío si no hay sesión', async () => {
    const { result } = await renderHook(() => useUserName());
    expect(result.current).toBe('');

    await act(async () => {
      useSessionStore.setState({ session });
    });
    expect(result.current).toBe('Ana Prueba');

    await act(async () => {
      useSessionStore.setState({ session: null });
    });
    expect(result.current).toBe('');
  });
});
