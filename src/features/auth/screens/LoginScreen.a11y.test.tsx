import { act, render, screen, userEvent, waitFor, within } from '@testing-library/react-native';
import { AccessibilityInfo, Platform, StyleSheet } from 'react-native';

import { ERROR_MESSAGES } from '@/services/api/errors';
import { layout } from '@/theme';
import { loginUnauthorized } from '@/test/apiFixtures';
import { mockFetchResponse } from '@/test/fetchMock';
import { prepareSessionTest } from '@/test/sessionHelpers';

import { useSessionStore } from '../sessionStore';
import { LOGIN_MESSAGES } from '../validateLogin';

import { LoginScreen } from './LoginScreen';

const EMAIL = 'Correo electrónico';
const PASSWORD = 'Contraseña';
const SHOW_PASSWORD = 'Mostrar contraseña';
const SUBMIT = 'Entrar';

function heightOf(element: ReturnType<typeof screen.getByRole>) {
  return StyleSheet.flatten(element.props.style).height;
}

describe('LoginScreen: accesibilidad', () => {
  beforeEach(prepareSessionTest);
  afterEach(jest.restoreAllMocks);

  it('cada control tiene rol y etiqueta en español y el saludo es un encabezado', async () => {
    await render(<LoginScreen />);

    expect(screen.getByLabelText(EMAIL)).toHaveAccessibleName(EMAIL);
    expect(screen.getByLabelText(PASSWORD)).toHaveAccessibleName(PASSWORD);
    expect(screen.getByRole('button', { name: SHOW_PASSWORD })).toHaveAccessibleName(SHOW_PASSWORD);
    expect(screen.getByRole('button', { name: SUBMIT })).toHaveAccessibleName(SUBMIT);
    expect(screen.queryByRole('header', { name: 'Hola de nuevo' })).toBeOnTheScreen();
    expect(screen.queryByLabelText('BancoXYZ')).toBeOnTheScreen();
  });

  it('el ojo y Entrar tienen al menos 48 de alto', async () => {
    await render(<LoginScreen />);

    expect(heightOf(screen.getByRole('button', { name: SHOW_PASSWORD }))).toBeGreaterThanOrEqual(
      layout.minTouch,
    );
    expect(heightOf(screen.getByRole('button', { name: SUBMIT }))).toBeGreaterThanOrEqual(
      layout.minTouch,
    );
  });

  it('Entrar es la única acción principal y no ofrece recuperar contraseña, crear cuenta ni redes sociales', async () => {
    await render(<LoginScreen />);

    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByRole('button', { name: SHOW_PASSWORD })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: SUBMIT })).toBeOnTheScreen();
    expect(screen.queryByText(/olvid/i)).toBeNull();
    expect(screen.queryByText(/crear cuenta|regístrate/i)).toBeNull();
    expect(screen.queryByText(/google|facebook|apple/i)).toBeNull();
  });
});

function politeRegions() {
  return screen.container.queryAll((node) => node.props.accessibilityLiveRegion === 'polite');
}

const SPACING_KEYS = ['height', 'minHeight', 'margin', 'marginTop', 'marginBottom', 'marginVertical'];

type HostNode = ReturnType<typeof politeRegions>[number];

function spacingOf(node: HostNode | null | undefined) {
  const style: object = StyleSheet.flatten(node?.props.style) ?? {};
  return Object.entries(style)
    .filter(([key, value]) => SPACING_KEYS.includes(key) && value !== 0)
    .map(([key]) => key);
}

describe('LoginScreen: aviso de sesión caducada accesible', () => {
  beforeEach(prepareSessionTest);
  afterEach(jest.restoreAllMocks);

  it('el aviso de sesión caducada vive en una región polite siempre montada y su texto aparece en ella', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockClear();
    const message = ERROR_MESSAGES.unauthorized;
    await render(<LoginScreen />);
    const before = politeRegions();

    await act(async () => useSessionStore.setState({ expiredEmail: 'ana@ejemplo.com' }));

    const holder = politeRegions().find((region) => within(region).queryByText(message));
    expect(before).toContain(holder);
    expect(announce).toHaveBeenCalledWith(message);

    await act(async () => useSessionStore.setState({ expiredEmail: null }));
    expect(holder).toBeEmptyElement();
    expect(spacingOf(holder)).toEqual([]);
    expect(spacingOf(holder?.parent)).toEqual([]);
  });
});

function announcedInRegion(message: string) {
  return politeRegions().some((region) => within(region).queryByText(message) !== null);
}

describe('LoginScreen: mostrar la contraseña', () => {
  beforeEach(prepareSessionTest);
  afterEach(jest.restoreAllMocks);

  it('el ojo muestra y oculta la contraseña escrita', async () => {
    await render(<LoginScreen />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(PASSWORD), 'secreta');

    expect(screen.getByLabelText(PASSWORD)).toHaveProp('secureTextEntry', true);
    await user.press(screen.getByRole('button', { name: SHOW_PASSWORD }));
    expect(screen.getByLabelText(PASSWORD)).toHaveProp('secureTextEntry', false);
    expect(screen.getByLabelText(PASSWORD)).toHaveDisplayValue('secreta');

    await user.press(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(screen.getByLabelText(PASSWORD)).toHaveProp('secureTextEntry', true);
    expect(screen.getByLabelText(PASSWORD)).toHaveDisplayValue('secreta');
    expect(screen.getByRole('button', { name: SHOW_PASSWORD })).toBeOnTheScreen();
  });
});

describe('LoginScreen: anuncios de errores y avisos', () => {
  beforeEach(prepareSessionTest);
  afterEach(jest.restoreAllMocks);

  it('anuncia los errores de campo, el aviso de error y el de sesión caducada', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockClear();
    mockFetchResponse(401, loginUnauthorized);
    await render(<LoginScreen />);
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: SUBMIT }));
    for (const message of [LOGIN_MESSAGES.emailRequired, LOGIN_MESSAGES.passwordRequired]) {
      expect(announce).toHaveBeenCalledWith(message);
      expect(announcedInRegion(message)).toBe(true);
    }

    await user.type(screen.getByLabelText(EMAIL), 'ana@ejemplo.com');
    await user.type(screen.getByLabelText(PASSWORD), 'secreta');
    await user.press(screen.getByRole('button', { name: SUBMIT }));
    await waitFor(() => expect(announce).toHaveBeenCalledWith(ERROR_MESSAGES.invalidCredentials));
    expect(announcedInRegion(ERROR_MESSAGES.invalidCredentials)).toBe(true);

    await act(async () => useSessionStore.setState({ expiredEmail: 'ana@ejemplo.com' }));
    expect(announce).toHaveBeenCalledWith(ERROR_MESSAGES.unauthorized);
    expect(announcedInRegion(ERROR_MESSAGES.unauthorized)).toBe(true);
  });
});
