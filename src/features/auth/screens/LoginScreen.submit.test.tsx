import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import { API_URLS } from '@/services/api/endpoints';
import { lastFetchCall } from '@/test/fetchMock';
import { mockFetchPending } from '@/test/fetchPending';
import { watchFocus } from '@/test/focus';
import { prepareSessionTest } from '@/test/sessionHelpers';

import { LoginScreen } from './LoginScreen';

async function fillLogin(email: string, password: string) {
  watchFocus();
  await render(<LoginScreen />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Correo electrónico'), email);
  await user.type(screen.getByLabelText('Contraseña'), password);
  return user;
}

async function submitWith(email: string, password: string) {
  const user = await fillLogin(email, password);
  await user.press(screen.getByRole('button', { name: 'Entrar' }));
}

describe('LoginScreen: datos enviados', () => {
  beforeEach(prepareSessionTest);
  afterEach(jest.restoreAllMocks);

  it('envía el correo recortado y con sus mayúsculas', async () => {
    mockFetchPending();

    await submitWith('  Ana@Ejemplo.com  ', 'secreta');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const call = lastFetchCall();
    expect(call.url).toBe(API_URLS.login);
    expect(call.method).toBe('POST');
    expect(call.body).toEqual({ email: 'Ana@Ejemplo.com', password: 'secreta' });
  });

  it('envía una contraseña de solo espacios sin recortarla', async () => {
    mockFetchPending();

    await submitWith('ana@ejemplo.com', '   ');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(lastFetchCall().body).toEqual({ email: 'ana@ejemplo.com', password: '   ' });
  });
});

describe('LoginScreen: estado de envío', () => {
  beforeEach(prepareSessionTest);
  afterEach(jest.restoreAllMocks);

  it('mientras envía muestra Entrando…, deshabilitado y ocupado, bloquea los campos y no muestra indicador de progreso', async () => {
    mockFetchPending();

    await submitWith('ana@ejemplo.com', 'secreta');

    const button = screen.queryByRole('button', { name: 'Entrando…' });
    expect(button).toBeOnTheScreen();
    expect(button).toBeDisabled();
    expect(button).toBeBusy();
    expect(screen.queryByRole('button', { name: 'Entrar' })).toBeNull();
    expect(screen.getByLabelText('Correo electrónico')).toBeDisabled();
    expect(screen.getByLabelText('Contraseña')).toBeDisabled();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});

describe('LoginScreen: doble envío', () => {
  beforeEach(prepareSessionTest);
  afterEach(jest.restoreAllMocks);

  it('envía una sola petición aunque se pulse Entrar o enviar varias veces durante el envío', async () => {
    mockFetchPending();
    const user = await fillLogin('ana@ejemplo.com', 'secreta');
    const password = screen.getByLabelText('Contraseña');
    const entrar = screen.getByRole('button', { name: 'Entrar' });

    await Promise.all([
      fireEvent.press(entrar),
      fireEvent.press(entrar),
      fireEvent(password, 'submitEditing'),
    ]);
    await user.press(screen.getByRole('button', { name: 'Entrando…' }));
    await fireEvent(password, 'submitEditing');

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
