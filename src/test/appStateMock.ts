import { act } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

type StateHandler = (state: AppStateStatus) => void;

export type CapturedSubscription = { remove: jest.Mock };

export type AppStateCapture = {
  emit: (state: AppStateStatus) => Promise<void>;
  subscriptions: () => CapturedSubscription[];
};

type Registration = { handler: StateHandler; subscription: CapturedSubscription; active: boolean };

// Llamar antes de montar (p. ej. en `beforeEach`). El preset de Jest no da un `currentState` real,
// así que quien se suscribe no puede depender de él: solo recibe lo que se emite aquí.
// Tras `remove()` la suscripción deja de recibir emisiones, como en el sistema real.
export function captureAppState(): AppStateCapture {
  const registrations: Registration[] = [];
  jest
    .mocked(AppState.addEventListener)
    .mockClear()
    .mockImplementation((_type, handler) => {
      const registration: Registration = {
        handler,
        active: true,
        subscription: {
          remove: jest.fn(() => {
            registration.active = false;
          }),
        },
      };
      registrations.push(registration);
      return registration.subscription;
    });

  return {
    emit: (state) =>
      act(async () => {
        registrations.filter(({ active }) => active).forEach(({ handler }) => handler(state));
      }),
    subscriptions: () => registrations.map(({ subscription }) => subscription),
  };
}
