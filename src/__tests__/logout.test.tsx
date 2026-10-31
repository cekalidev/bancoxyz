import { act, userEvent } from '@testing-library/react-native';
import { screen, testRouter } from 'expo-router/testing-library';
import { Alert, type AlertButton } from 'react-native';

import { useSessionStore } from '@/features/auth/sessionStore';
import { ERROR_MESSAGES } from '@/services/api/errors';
import type { Session } from '@/services/api/types';
import { focusedFieldLabels, watchFocus } from '@/test/focus';
import { failDeletes, resetSecureStore, storedValue } from '@/test/secureStoreMock';
import {
  prepareAppTest,
  relaunchApp,
  renderApp,
  resetSessionStore,
  seedSession,
} from '@/test/sessionHelpers';

jest.mock('expo-font', () => ({ useFonts: jest.fn(() => [true, null]) }));

const HOME_GREETING = 'Hola, Ana Prueba';
const LOGIN_TITLE = 'Hola de nuevo';
const NOT_FOUND_TITLE = 'Esta pantalla no existe';
const LOGOUT_LABEL = 'Cerrar sesión';
const EMAIL = 'Correo electrónico';
const PASSWORD = 'Contraseña';

const session: Session = {
  token: 'token-de-prueba',
  user: { id: 7, name: 'Ana Prueba', email: 'ana@ejemplo.com' },
};

function spyOnAlert() {
  return jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
}

async function openHomeAndPressLogout() {
  seedSession(session);
  await renderApp('/');
  const user = userEvent.setup();
  await user.press(await screen.findByRole('button', { name: LOGOUT_LABEL }));
}

function dialogButton(alert: ReturnType<typeof spyOnAlert>, text: string): AlertButton {
  const buttons = alert.mock.calls[0]?.[2] ?? [];
  const button = buttons.find((candidate) => candidate.text === text);
  if (!button) throw new Error(`El diálogo no tiene el botón ${text}`);
  return button;
}

async function chooseInDialog(alert: ReturnType<typeof spyOnAlert>, text: string) {
  const button = dialogButton(alert, text);
  await act(async () => button.onPress?.());
}

function politeRegions() {
  return screen.container.queryAll((node) => node.props.accessibilityLiveRegion === 'polite');
}

beforeEach(prepareAppTest);
afterEach(jest.restoreAllMocks);

describe('Salir en la cabecera', () => {
  it('el Inicio muestra Salir como botón con etiqueta Cerrar sesión', async () => {
    seedSession(session);
    await renderApp('/');

    expect(await screen.findByText(HOME_GREETING)).toBeOnTheScreen();
    const logout = screen.getByRole('button', { name: LOGOUT_LABEL });
    expect(logout).toHaveAccessibleName(LOGOUT_LABEL);
    expect(screen.getByText('Salir')).toBeOnTheScreen();
  });

  it('Salir no aparece en la pantalla inexistente ni en el login', async () => {
    seedSession(session);
    await renderApp('/no-existe');

    expect(await screen.findByRole('header', { name: NOT_FOUND_TITLE })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: LOGOUT_LABEL })).toBeNull();
    expect(screen.queryByText('Salir')).toBeNull();

    await screen.unmount();
    resetSessionStore();
    resetSecureStore();
    await renderApp('/login');

    expect(await screen.findByText(LOGIN_TITLE)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: LOGOUT_LABEL })).toBeNull();
    expect(screen.queryByText('Salir')).toBeNull();
  });
});

describe('confirmación de Salir', () => {
  it('Salir pide confirmación con Cancelar y Salir y se puede cerrar tocando fuera', async () => {
    const alert = spyOnAlert();

    await openHomeAndPressLogout();

    expect(alert).toHaveBeenCalledTimes(1);
    const [title, message, buttons, options] = alert.mock.calls[0] ?? [];
    expect(title).toBe('¿Cerrar sesión?');
    expect(message).toBeUndefined();
    expect(buttons).toEqual([
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: expect.any(Function) },
    ]);
    expect(options).toEqual(expect.objectContaining({ cancelable: true }));
  });

  it('Cancelar no cambia la sesión ni la pantalla', async () => {
    const alert = spyOnAlert();
    await openHomeAndPressLogout();

    await chooseInDialog(alert, 'Cancelar');

    expect(screen).toHavePathname('/');
    expect(screen.getByText(HOME_GREETING)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: LOGOUT_LABEL })).toBeOnTheScreen();
    expect(useSessionStore.getState()).toEqual({ session, expiredEmail: null });
    expect(storedValue()).toBe(JSON.stringify(session));
  });
});

describe('al confirmar Salir', () => {
  it('al confirmar Salir muestra el login vacío, atrás no vuelve al Inicio y al reabrir pide login', async () => {
    const alert = spyOnAlert();
    await openHomeAndPressLogout();

    await chooseInDialog(alert, 'Salir');

    expect(await screen.findByText(LOGIN_TITLE)).toBeOnTheScreen();
    expect(screen).toHavePathname('/login');
    expect(screen.queryByText(HOME_GREETING)).toBeNull();
    expect(screen.getByLabelText(EMAIL)).toHaveDisplayValue('');
    expect(screen.getByLabelText(PASSWORD)).toHaveDisplayValue('');
    expect(useSessionStore.getState()).toEqual({ session: null, expiredEmail: null });
    expect(testRouter.canGoBack()).toBe(false);
    expect(storedValue()).toBeNull();

    await relaunchApp('/');

    expect(await screen.findByText(LOGIN_TITLE)).toBeOnTheScreen();
    expect(screen).toHavePathname('/login');
    expect(screen.queryByText(HOME_GREETING)).toBeNull();
  });
});

describe('login tras salir', () => {
  it('tras salir muestra el login vacío y sin aviso', async () => {
    const alert = spyOnAlert();
    watchFocus();
    await openHomeAndPressLogout();

    await chooseInDialog(alert, 'Salir');

    expect(await screen.findByText(LOGIN_TITLE)).toBeOnTheScreen();
    const password = screen.getByLabelText(PASSWORD);
    expect(screen.getByLabelText(EMAIL)).toHaveDisplayValue('');
    expect(password).toHaveDisplayValue('');
    expect(password).toHaveProp('secureTextEntry', true);
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
    expect(screen.queryByText(ERROR_MESSAGES.unauthorized)).toBeNull();
    expect(politeRegions().length).toBeGreaterThan(0);
    politeRegions().forEach((region) => expect(region).toBeEmptyElement());
    expect(focusedFieldLabels()).toEqual([]);
  });
});

const CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'debug'] as const;

function spyOnConsole() {
  return CONSOLE_METHODS.map((method) =>
    jest.spyOn(console, method).mockImplementation(() => undefined),
  );
}

describe('sesión borrada al salir', () => {
  it('no registra ni muestra el token al salir', async () => {
    const consoleSpies = spyOnConsole();
    const alert = spyOnAlert();
    await openHomeAndPressLogout();

    await chooseInDialog(alert, 'Salir');

    expect(await screen.findByText(LOGIN_TITLE)).toBeOnTheScreen();
    expect(screen.queryByText(new RegExp(session.token))).toBeNull();
    expect(storedValue()).toBeNull();
    const logged = consoleSpies.flatMap((spy) => spy.mock.calls.flat().map(String));
    logged.forEach((entry) => expect(entry).not.toContain(session.token));
  });

  it('si falla el borrado al salir muestra el login sin error y al reabrir no restaura la sesión', async () => {
    const alert = spyOnAlert();
    failDeletes();
    await openHomeAndPressLogout();

    await chooseInDialog(alert, 'Salir');

    expect(await screen.findByText(LOGIN_TITLE)).toBeOnTheScreen();
    expect(alert).toHaveBeenCalledTimes(1);
    politeRegions().forEach((region) => expect(region).toBeEmptyElement());
    expect(storedValue() ?? '').not.toContain(session.token);

    await relaunchApp('/');

    expect(await screen.findByText(LOGIN_TITLE)).toBeOnTheScreen();
    expect(screen).toHavePathname('/login');
    expect(screen.queryByText(HOME_GREETING)).toBeNull();
  });
});
