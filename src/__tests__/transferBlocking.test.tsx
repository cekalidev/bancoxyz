import { router } from 'expo-router';
import { act, fireEvent, screen } from 'expo-router/testing-library';

import { ERROR_MESSAGES } from '@/services/api/errors';
import { exposedStrings } from '@/test/a11yTree';
import { balanceOk, loginOk, sessionUnauthorized, transferOk } from '@/test/apiFixtures';
import { mockApiRoutes, reply, type Reply } from '@/test/fetchMock';
import { settleRequests } from '@/test/homeHelpers';
import { prepareSessionTest, renderApp, seedSession } from '@/test/sessionHelpers';
import { advancePastTimeout } from '@/test/timers';
import { fillValidForm, TRANSFER_NOW, transferRequests } from '@/test/transferHelpers';
import { pressButton } from '@/test/transferSessionHelpers';

jest.mock('expo-font', () => ({ useFonts: jest.fn(() => [true, null]) }));

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

beforeEach(() => {
  prepareSessionTest();
  seedSession(loginOk);
  jest.useFakeTimers().setSystemTime(TRANSFER_NOW);
});
afterEach(jest.restoreAllMocks);

// Abre la app con sesión guardada, rellena el formulario y confirma; la transferencia queda sin
// respuesta si no se indica otra.
async function confirmWithPendingTransfer(transfer: Reply = 'pending') {
  mockApiRoutes({ balance: reply(200, balanceOk), transfer });
  await renderApp('/');
  await fireEvent.press(await screen.findByRole('button', { name: 'Nueva transferencia' }));
  await settleRequests();
  await fillValidForm();
  await pressButton('Continuar');
  await pressButton('Confirmar transferencia');
}

describe('bloqueo de salida durante el envío', () => {
  it('mientras envía, atrás no sale de la confirmación', async () => {
    await confirmWithPendingTransfer();
    expect(screen.getByRole('button', { name: 'Transfiriendo…' })).toBeOnTheScreen();

    // La transferencia sigue sin respuesta: no se espera a la red, solo a que la navegación se aplique.
    await act(() => router.back());

    expect(screen).toHavePathname('/nueva-transferencia/confirmar');
    expect(screen.getByRole('button', { name: 'Transfiriendo…' })).toBeOnTheScreen();
    expect(transferRequests()).toHaveLength(1);
  });

  it('el bloqueo termina con la respuesta', async () => {
    await confirmWithPendingTransfer(reply(200, transferOk));
    await settleRequests();
    expect(screen).toHavePathname('/nueva-transferencia/resultado');

    await act(() => router.back());

    expect(screen).toHavePathname('/');
    expect(router.canGoBack()).toBe(false);
  });

  it('a los 15 s sin respuesta termina en el incierto', async () => {
    await confirmWithPendingTransfer();

    await act(() => advancePastTimeout());

    expect(screen).toHavePathname('/nueva-transferencia/resultado');
    expect(screen.getByRole('header', { name: 'No pudimos confirmar si la transferencia se realizó' })).toBeOnTheScreen();
    await act(() => router.back());
    expect(screen).toHavePathname('/');
    expect(router.canGoBack()).toBe(false);
  });

});

describe('sesión caducada durante el envío', () => {
  it('un 401 durante el envío lleva al login con el aviso de sesión caducada a pesar del bloqueo', async () => {
    await confirmWithPendingTransfer(reply(401, sessionUnauthorized));
    await settleRequests();

    expect(screen).toHavePathname('/login');
    expect(screen.getByText('Tu sesión expiró. Inicia sesión de nuevo.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Continuar' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Transfiriendo…' })).not.toBeOnTheScreen();
  });
});

describe('textos tras un 401 al transferir', () => {
  // El aviso de sesión caducada del login es el mensaje genérico de sesión caducada y debe verse una
  // sola vez; el resto de los mensajes genéricos de la API no puede aparecer.
  const forbiddenGeneric = [
    ERROR_MESSAGES.badRequest,
    ERROR_MESSAGES.invalidCredentials,
    ERROR_MESSAGES.network,
    ERROR_MESSAGES.unknown,
  ];

  it('un 401 al transferir no muestra texto del servidor ni mensajes genéricos', async () => {
    await confirmWithPendingTransfer(reply(401, sessionUnauthorized));
    await settleRequests();
    expect(screen).toHavePathname('/login');

    const strings = exposedStrings();

    expect(strings.some((text) => text.includes(sessionUnauthorized.message))).toBe(false);
    expect(strings.filter((text) => forbiddenGeneric.includes(text))).toEqual([]);
    expect(strings.filter((text) => text === ERROR_MESSAGES.unauthorized)).toHaveLength(1);
  });
});
