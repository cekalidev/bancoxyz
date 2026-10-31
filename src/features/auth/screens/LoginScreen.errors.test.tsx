import { act, fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, Platform } from 'react-native';

import { ERROR_MESSAGES } from '@/services/api/errors';
import { REQUEST_TIMEOUT_MS } from '@/services/api/withTimeout';
import { loginUnauthorized } from '@/test/apiFixtures';
import {
  mockFetchNetworkError,
  mockFetchPending,
  mockFetchPendingEach,
  mockFetchResponse,
} from '@/test/fetchMock';
import { focusedFieldLabels, watchFocus } from '@/test/focus';
import { prepareSessionTest } from '@/test/sessionHelpers';

import { useSessionStore } from '../sessionStore';
import { LOGIN_MESSAGES } from '../validateLogin';

import { LoginScreen } from './LoginScreen';

const EMAIL = 'Correo electrónico';
const PASSWORD = 'Contraseña';

type Failure = {
  caso: string;
  mock: () => unknown;
  timeout?: boolean;
  message: string;
  serverText: string;
};

const FAILURES: Failure[] = [
  {
    caso: 'credenciales incorrectas (401)',
    mock: () => mockFetchResponse(401, loginUnauthorized),
    message: ERROR_MESSAGES.invalidCredentials,
    serverText: loginUnauthorized.message,
  },
  {
    caso: 'sin red',
    mock: mockFetchNetworkError,
    message: ERROR_MESSAGES.network,
    serverText: 'Network request failed',
  },
  {
    caso: 'tiempo agotado a los 15 s',
    mock: mockFetchPending,
    timeout: true,
    message: ERROR_MESSAGES.network,
    serverText: 'Aborted',
  },
  {
    caso: 'datos inválidos (400)',
    mock: () => mockFetchResponse(400, { message: 'Bad Request: dados inválidos' }),
    message: ERROR_MESSAGES.badRequest,
    serverText: 'Bad Request: dados inválidos',
  },
  {
    caso: 'error del servidor (500)',
    mock: () => mockFetchResponse(500, { message: 'Internal Server Error' }),
    message: ERROR_MESSAGES.unknown,
    serverText: 'Internal Server Error',
  },
];

async function failLogin(failure: Failure) {
  failure.mock();
  watchFocus();
  await render(<LoginScreen />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(EMAIL), 'ana@ejemplo.com');
  await user.type(screen.getByLabelText(PASSWORD), 'secreta');
  if (failure.timeout) jest.useFakeTimers();
  await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
  if (failure.timeout) await act(() => jest.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS));
  await waitFor(() => expect(screen.queryByText(failure.message)).toBeOnTheScreen());
}

describe('LoginScreen: errores del servidor', () => {
  beforeEach(prepareSessionTest);
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it.each(FAILURES)(
    'muestra el mensaje exacto de cada error del login sin el texto del servidor y conserva lo escrito: $caso',
    async (failure) => {
      await failLogin(failure);

      expect(screen.queryByText(failure.message)).toBeOnTheScreen();
      expect(screen.queryByText(failure.serverText)).toBeNull();
      expect(screen.getByLabelText(EMAIL)).toHaveDisplayValue('ana@ejemplo.com');
      expect(screen.getByLabelText(PASSWORD)).toHaveDisplayValue('secreta');
      expect(screen.queryByRole('button', { name: 'Entrar' })).toBeEnabled();
    },
  );

  it.each(FAILURES)('ante un error del servidor no marca ningún campo ni mueve el foco: $caso', async (failure) => {
    await failLogin(failure);

    Object.values(LOGIN_MESSAGES).forEach((message) => {
      expect(screen.queryByText(message)).toBeNull();
    });
    expect(focusedFieldLabels()).toEqual([]);
  });
});

describe('LoginScreen: aviso de error al editar', () => {
  beforeEach(prepareSessionTest);
  afterEach(jest.restoreAllMocks);

  it.each([EMAIL, PASSWORD])('el aviso de error desaparece al editar el correo o la contraseña: %s', async (label) => {
    const [unauthorized] = FAILURES;
    await failLogin(unauthorized);

    await userEvent.setup().type(screen.getByLabelText(label), 'x');

    expect(screen.queryByText(unauthorized.message)).toBeNull();
  });
});

describe('LoginScreen: reintento tras un error', () => {
  beforeEach(prepareSessionTest);
  afterEach(jest.restoreAllMocks);

  it('al reintentar el aviso desaparece y si vuelve a fallar reaparece y se anuncia otra vez', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockClear();
    const message = ERROR_MESSAGES.invalidCredentials;
    const pending = mockFetchPendingEach();
    await render(<LoginScreen />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(EMAIL), 'ana@ejemplo.com');
    await user.type(screen.getByLabelText(PASSWORD), 'secreta');

    await user.press(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    await act(async () => pending.resolve(0, 401, loginUnauthorized));
    await waitFor(() => expect(screen.queryByText(message)).toBeOnTheScreen());

    await user.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(screen.queryByText(message)).toBeNull();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    await act(async () => pending.resolve(1, 401, loginUnauthorized));
    await waitFor(() => expect(screen.queryByText(message)).toBeOnTheScreen());
    expect(announce.mock.calls.filter(([text]) => text === message)).toHaveLength(2);
  });
});

type Submitter = { tecla: string; send: (user: ReturnType<typeof userEvent.setup>) => Promise<void> };

const SUBMITTERS: Submitter[] = [
  { tecla: 'Entrar', send: (user) => user.press(screen.getByRole('button', { name: 'Entrar' })) },
  { tecla: 'enviar', send: (user) => user.type(screen.getByLabelText(PASSWORD), '!', { submitEditing: true }) },
];

describe('LoginScreen: aviso de sesión caducada', () => {
  beforeEach(prepareSessionTest);
  afterEach(jest.restoreAllMocks);

  it.each(SUBMITTERS)('el aviso de sesión caducada desaparece al pulsar Entrar o enviar: $tecla', async ({ send }) => {
    mockFetchPending();
    useSessionStore.setState({ expiredEmail: 'ana@ejemplo.com' });
    await render(<LoginScreen />);
    expect(screen.queryByText(ERROR_MESSAGES.unauthorized)).toBeOnTheScreen();
    expect(screen.getByLabelText(EMAIL)).toHaveDisplayValue('ana@ejemplo.com');
    expect(screen.getByLabelText(PASSWORD)).toHaveDisplayValue('');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(PASSWORD), 'secreta');

    await send(user);

    expect(screen.queryByText(ERROR_MESSAGES.unauthorized)).toBeNull();
  });
});
