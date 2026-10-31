import { render, screen, userEvent } from '@testing-library/react-native';

import { mockFetchPending } from '@/test/fetchMock';
import { focusedFieldLabels, watchFocus } from '@/test/focus';
import { prepareSessionTest } from '@/test/sessionHelpers';

import { LOGIN_MESSAGES } from '../validateLogin';

import { LoginScreen } from './LoginScreen';

const EMAIL = 'Correo electrónico';
const PASSWORD = 'Contraseña';

async function renderLogin() {
  watchFocus();
  await render(<LoginScreen />);
}

async function submitWith(email: string, password: string) {
  const user = userEvent.setup();
  if (email) await user.type(screen.getByLabelText(EMAIL), email);
  if (password) await user.type(screen.getByLabelText(PASSWORD), password);
  await user.press(screen.getByRole('button', { name: 'Entrar' }));
}

function liveRegions() {
  return screen.container.queryAll((node) => node.props.accessibilityLiveRegion === 'polite');
}

describe('LoginScreen: estado inicial', () => {
  beforeEach(prepareSessionTest);
  afterEach(jest.restoreAllMocks);

  it('empieza con los campos vacíos, la contraseña oculta, Entrar habilitado, sin avisos ni errores y sin foco', async () => {
    await renderLogin();

    const email = screen.getByLabelText(EMAIL);
    const password = screen.getByLabelText(PASSWORD);

    expect(email).toHaveDisplayValue('');
    expect(password).toHaveDisplayValue('');
    expect(password).toHaveProp('secureTextEntry', true);
    expect(screen.getByRole('button', { name: 'Mostrar contraseña' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
    expect(liveRegions().length).toBeGreaterThan(0);
    liveRegions().forEach((region) => expect(region).toBeEmptyElement());
    expect(focusedFieldLabels()).toEqual([]);
    expect(email).not.toHaveProp('autoFocus', true);
    expect(password).not.toHaveProp('autoFocus', true);
  });
});

describe('LoginScreen: validación al pulsar Entrar', () => {
  beforeEach(prepareSessionTest);
  afterEach(jest.restoreAllMocks);

  it('con el correo vacío muestra Escribe tu correo y no envía nada', async () => {
    mockFetchPending();
    await renderLogin();

    await submitWith('', 'secreta');

    expect(screen.queryByText(LOGIN_MESSAGES.emailRequired)).toBeOnTheScreen();
    expect(screen.queryByText(LOGIN_MESSAGES.passwordRequired)).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('con un correo sin formato muestra Escribe un correo válido y no envía nada', async () => {
    mockFetchPending();
    await renderLogin();

    await submitWith('ana@ejemplo', 'secreta');

    expect(screen.queryByText(LOGIN_MESSAGES.emailInvalid)).toBeOnTheScreen();
    expect(screen.queryByText(LOGIN_MESSAGES.passwordRequired)).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('con la contraseña vacía muestra Escribe tu contraseña y no envía nada', async () => {
    mockFetchPending();
    await renderLogin();

    await submitWith('ana@ejemplo.com', '');

    expect(screen.queryByText(LOGIN_MESSAGES.passwordRequired)).toBeOnTheScreen();
    expect(screen.queryByText(LOGIN_MESSAGES.emailRequired)).toBeNull();
    expect(screen.queryByText(LOGIN_MESSAGES.emailInvalid)).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('LoginScreen: foco tras validar', () => {
  beforeEach(prepareSessionTest);
  afterEach(jest.restoreAllMocks);

  it('con los dos campos mal muestra ambos mensajes, no envía nada y enfoca el correo', async () => {
    mockFetchPending();
    await renderLogin();

    await submitWith('ana', '');

    expect(screen.queryByText(LOGIN_MESSAGES.emailInvalid)).toBeOnTheScreen();
    expect(screen.queryByText(LOGIN_MESSAGES.passwordRequired)).toBeOnTheScreen();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(focusedFieldLabels()).toEqual([EMAIL]);
  });

  it('con solo la contraseña mal enfoca la contraseña', async () => {
    mockFetchPending();
    await renderLogin();

    await submitWith('ana@ejemplo.com', '');

    expect(focusedFieldLabels()).toEqual([PASSWORD]);
  });
});

describe('LoginScreen: revalidación al editar', () => {
  beforeEach(prepareSessionTest);
  afterEach(jest.restoreAllMocks);

  it('actualiza el error de un campo en cada cambio tras el envío', async () => {
    mockFetchPending();
    await renderLogin();
    await submitWith('', 'secreta');
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(EMAIL), 'a');
    expect(screen.queryByText(LOGIN_MESSAGES.emailInvalid)).toBeOnTheScreen();
    expect(screen.queryByText(LOGIN_MESSAGES.emailRequired)).toBeNull();

    await user.type(screen.getByLabelText(EMAIL), 'na@ejemplo.com');
    expect(screen.queryByText(LOGIN_MESSAGES.emailInvalid)).toBeNull();
    expect(screen.queryByText(LOGIN_MESSAGES.emailRequired)).toBeNull();
  });

  it('no valida mientras se edita un campo sin error', async () => {
    mockFetchPending();
    await renderLogin();
    await submitWith('ana@ejemplo.com', '');
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText(EMAIL));
    await user.type(screen.getByLabelText(EMAIL), 'ana');

    expect(screen.queryByText(LOGIN_MESSAGES.emailRequired)).toBeNull();
    expect(screen.queryByText(LOGIN_MESSAGES.emailInvalid)).toBeNull();
    expect(screen.queryByText(LOGIN_MESSAGES.passwordRequired)).toBeOnTheScreen();
  });

});

describe('LoginScreen: antes del primer envío y botón Entrar', () => {
  beforeEach(prepareSessionTest);
  afterEach(jest.restoreAllMocks);

  it('no muestra errores antes del primer envío', async () => {
    await renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(EMAIL), 'ana');
    await user.type(screen.getByLabelText(PASSWORD), 'x');
    await user.clear(screen.getByLabelText(PASSWORD));

    Object.values(LOGIN_MESSAGES).forEach((message) => {
      expect(screen.queryByText(message)).toBeNull();
    });
  });

  it('mantiene Entrar habilitado con campos vacíos, inválidos o con errores visibles', async () => {
    mockFetchPending();
    await renderLogin();
    const entrar = () => screen.getByRole('button', { name: 'Entrar' });
    expect(entrar()).toBeEnabled();

    await userEvent.setup().type(screen.getByLabelText(EMAIL), 'ana');
    expect(entrar()).toBeEnabled();

    await submitWith('', '');
    expect(screen.queryByText(LOGIN_MESSAGES.emailInvalid)).toBeOnTheScreen();
    expect(screen.queryByText(LOGIN_MESSAGES.passwordRequired)).toBeOnTheScreen();
    expect(entrar()).toBeEnabled();
  });
});

describe('LoginScreen: teclas siguiente y enviar', () => {
  beforeEach(prepareSessionTest);
  afterEach(jest.restoreAllMocks);

  it('siguiente en el correo pasa el foco a la contraseña', async () => {
    await renderLogin();

    await userEvent.setup().type(screen.getByLabelText(EMAIL), 'ana', { submitEditing: true });

    expect(focusedFieldLabels()).toEqual([PASSWORD]);
  });

  it('enviar en la contraseña valida y envía como Entrar', async () => {
    mockFetchPending();
    await renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(PASSWORD), 'secreta', { submitEditing: true });
    expect(screen.queryByText(LOGIN_MESSAGES.emailRequired)).toBeOnTheScreen();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(focusedFieldLabels()).toEqual([EMAIL]);

    await user.type(screen.getByLabelText(EMAIL), 'ana@ejemplo.com');
    await user.type(screen.getByLabelText(PASSWORD), '!', { submitEditing: true });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe('LoginScreen: configuración del teclado', () => {
  beforeEach(prepareSessionTest);
  afterEach(jest.restoreAllMocks);

  it('configura el teclado de correo y de contraseña', async () => {
    await renderLogin();

    expect(screen.getByLabelText(EMAIL).props).toMatchObject({
      keyboardType: 'email-address',
      autoCapitalize: 'none',
      autoCorrect: false,
      autoComplete: 'email',
      returnKeyType: 'next',
      submitBehavior: 'submit',
    });
    expect(screen.getByLabelText(PASSWORD).props).toMatchObject({
      autoComplete: 'current-password',
      returnKeyType: 'go',
    });
    expect(screen.getByLabelText(EMAIL)).not.toHaveProp('textContentType');
    expect(screen.getByLabelText(PASSWORD)).not.toHaveProp('textContentType');
  });
});
