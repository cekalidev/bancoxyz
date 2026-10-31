import { userEvent } from '@testing-library/react-native';
import { screen, testRouter } from 'expo-router/testing-library';

import { LoginScreen } from '@/features/auth';
import type { Session } from '@/services/api/types';
import { prepareAppTest, renderApp, seedSession } from '@/test/sessionHelpers';
import { colors, layout, typography } from '@/theme';

jest.mock('expo-font', () => ({ useFonts: jest.fn(() => [true, null]) }));

const HOME_GREETING = 'Hola, Ana Prueba';
const LOGIN_TITLE = 'Hola de nuevo';
const BACK_HOME = 'Volver al inicio';
const NOT_FOUND_TITLE = 'Esta pantalla no existe';

const session: Session = {
  token: 'token-de-prueba',
  user: { id: 7, name: 'Ana Prueba', email: 'ana@ejemplo.com' },
};

async function pressBackHome() {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await user.press(await screen.findByRole('link', { name: BACK_HOME }));
}

beforeEach(prepareAppTest);

describe('pantallas protegidas sin sesión', () => {
  it('sin sesión abrir el Inicio por enlace muestra el login', async () => {
    await renderApp('/');

    expect(await screen.findByText(LOGIN_TITLE)).toBeOnTheScreen();
    expect(screen).toHavePathname('/login');
    expect(screen.queryByText(HOME_GREETING)).toBeNull();
  });

  it('sin sesión Volver al inicio termina en el login', async () => {
    await renderApp('/no-existe');

    await pressBackHome();

    expect(await screen.findByText(LOGIN_TITLE)).toBeOnTheScreen();
    expect(screen).toHavePathname('/login');
    expect(screen.queryByText(HOME_GREETING)).toBeNull();
  });
});

describe('pantallas protegidas con sesión', () => {
  beforeEach(() => seedSession(session));

  it('con sesión Volver al inicio abre el Inicio reemplazando la ruta', async () => {
    await renderApp('/no-existe');

    await pressBackHome();

    expect(screen).toHavePathname('/');
    expect(await screen.findByText(HOME_GREETING)).toBeOnTheScreen();
    expect(testRouter.canGoBack()).toBe(false);
  });

  it('con sesión abrir el login por enlace muestra el Inicio sin montar el login', async () => {
    let loginMounts = 0;
    function CountedLogin() {
      loginMounts += 1;
      return <LoginScreen />;
    }

    await renderApp('/login', CountedLogin);

    expect(await screen.findByText(HOME_GREETING)).toBeOnTheScreen();
    expect(screen).toHavePathname('/');
    expect(screen.queryByText(LOGIN_TITLE)).toBeNull();
    expect(loginMounts).toBe(0);
  });
});

describe('ruta inexistente', () => {
  it('muestra el aviso de pantalla inexistente con enlace para volver', async () => {
    await renderApp('/no-existe');

    const title = await screen.findByRole('header', { name: NOT_FOUND_TITLE });
    expect(title).toHaveStyle({ ...typography.h2, color: colors.text });
    expect(screen.getByLabelText('BancoXYZ')).toBeOnTheScreen();
    const link = screen.getByRole('link', { name: BACK_HOME });
    expect(link).toHaveStyle({ minHeight: layout.minTouch, backgroundColor: 'transparent' });
    expect(screen.getByText(BACK_HOME)).toHaveStyle({
      ...typography.button,
      color: colors.textStrong,
    });
  });
});
