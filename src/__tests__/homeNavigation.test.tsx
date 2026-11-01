import { router } from 'expo-router';
import { act, fireEvent, screen } from 'expo-router/testing-library';
import { Alert, type AlertButton } from 'react-native';

import { useSessionStore } from '@/features/auth/sessionStore';
import type { Session } from '@/services/api/types';
import { defer } from '@/test/defer';
import { balanceRequests, balanceResponse, settleRequests } from '@/test/homeHelpers';
import { prepareAppTest, renderApp, seedSession } from '@/test/sessionHelpers';

jest.mock('expo-font', () => ({ useFonts: jest.fn(() => [true, null]) }));
jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

const COUNTER = '3 transferencias';
const GREETING = 'Hola, Ana Prueba';
const FORM_AVAILABLE = 'Disponible: US$\u00a01.800,00';
const FIRST_AMOUNT = 'US$ 1.800,00';

const session: Session = {
  token: 'token-de-prueba',
  user: { id: 7, name: 'Ana Prueba', email: 'ana@ejemplo.com' },
};

// Abre el Inicio y espera al saludo y a la primera cifra, con las peticiones ya resueltas.
async function openHome() {
  await renderApp('/');
  expect(await screen.findByRole('header', { name: GREETING })).toBeOnTheScreen();
  await settleRequests();
  expect(screen.getByText(FIRST_AMOUNT)).toBeOnTheScreen();
}

// Retiene la primera respuesta del saldo; las siguientes siguen las rutas simuladas.
function holdFirstLoad() {
  const firstLoad = defer<Response>();
  jest.spyOn(global, 'fetch').mockImplementationOnce(() => firstLoad.promise);
  return firstLoad;
}

function spyOnAlert() {
  return jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
}

// Pulsa un botón del diálogo espiado como lo haría el sistema.
async function chooseInDialog(alert: ReturnType<typeof spyOnAlert>, text: string) {
  const buttons: AlertButton[] = alert.mock.calls[0]?.[2] ?? [];
  const button = buttons.find((candidate) => candidate.text === text);
  if (!button) throw new Error(`El diálogo no tiene el botón ${text}`);
  await act(async () => button.onPress?.());
}

beforeEach(prepareAppTest);
afterEach(jest.restoreAllMocks);

describe('accesos del Inicio', () => {
  beforeEach(() => seedSession(session));

  it('Nueva transferencia abre el formulario', async () => {
    await openHome();

    await fireEvent.press(screen.getByRole('button', { name: 'Nueva transferencia' }));

    expect(screen).toHavePathname('/nueva-transferencia');
    expect(await screen.findByLabelText('Valor')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Nueva transferencia' })).toBeOnTheScreen();
  });

  it('Ver transferencias abre el listado', async () => {
    await openHome();

    await fireEvent.press(screen.getByRole('button', { name: 'Ver transferencias' }));

    expect(screen).toHavePathname('/transferencias');
    expect(await screen.findByText(COUNTER)).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Transferencias' })).toBeOnTheScreen();
  });
});

describe('accesos del Inicio ante pulsaciones repetidas', () => {
  beforeEach(() => seedSession(session));

  it.each([
    { label: 'Nueva transferencia', path: '/nueva-transferencia' },
    { label: 'Ver transferencias', path: '/transferencias' },
  ])('dos pulsaciones seguidas abren una sola pantalla y un Volver regresa al Inicio ($label)', async ({ label, path }) => {
    await openHome();

    // Las dos pulsaciones llegan en el mismo tick, antes de que cambie la pantalla.
    const button = screen.getByRole('button', { name: label });
    await act(async () => {
      await Promise.all([fireEvent.press(button), fireEvent.press(button)]);
    });
    expect(screen).toHavePathname(path);

    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));

    expect(screen).toHavePathname('/');
    expect(router.canGoBack()).toBe(false);
  });

  it('tras volver el botón vuelve a navegar', async () => {
    await openHome();
    await fireEvent.press(screen.getByRole('button', { name: 'Ver transferencias' }));
    expect(screen).toHavePathname('/transferencias');
    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    expect(screen).toHavePathname('/');

    await fireEvent.press(screen.getByRole('button', { name: 'Ver transferencias' }));

    expect(screen).toHavePathname('/transferencias');
    expect(await screen.findByRole('header', { name: 'Transferencias' })).toBeOnTheScreen();
  });
});

describe('el Inicio mientras carga', () => {
  beforeEach(() => seedSession(session));

  it('se puede navegar mientras el saldo carga', async () => {
    const firstLoad = holdFirstLoad();
    await renderApp('/');
    expect(await screen.findByRole('header', { name: GREETING })).toBeOnTheScreen();
    expect(screen.getByLabelText('Cargando…')).toBeOnTheScreen();

    const button = screen.getByRole('button', { name: 'Nueva transferencia' });
    expect(button).toBeEnabled();
    await fireEvent.press(button);

    expect(screen).toHavePathname('/nueva-transferencia');
    expect(await screen.findByText(FORM_AVAILABLE)).toBeOnTheScreen();
    firstLoad.resolve(balanceResponse(1800));
    await settleRequests();
  });
});

describe('cabecera del Inicio', () => {
  beforeEach(() => seedSession(session));

  it('la cabecera del Inicio es la de siempre con BancoXYZ y Salir', async () => {
    await openHome();

    expect(screen.getByRole('header', { name: 'BancoXYZ' })).toBeOnTheScreen();
    const logout = screen.getByRole('button', { name: 'Cerrar sesión' });
    expect(logout).toHaveTextContent('Salir');
    expect(screen.queryByRole('button', { name: 'Volver' })).toBeNull();
  });

  it('cerrar el diálogo de Salir con Cancelar no pide el saldo', async () => {
    const alert = spyOnAlert();
    await openHome();
    expect(balanceRequests()).toHaveLength(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(alert).toHaveBeenCalledTimes(1);
    await chooseInDialog(alert, 'Cancelar');
    await settleRequests();

    expect(screen).toHavePathname('/');
    expect(useSessionStore.getState().session).toEqual(session);
    expect(balanceRequests()).toHaveLength(1);
  });
});
