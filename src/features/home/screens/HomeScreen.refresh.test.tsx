import { router } from 'expo-router';
import { act, fireEvent, screen } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { ERROR_MESSAGES } from '@/services/api/errors';
import { balanceBody, transferListWrapped } from '@/test/apiFixtures';
import { captureAppState, type AppStateCapture } from '@/test/appStateMock';
import { mockApiRoutes, reply } from '@/test/fetchMock';
import {
  balanceRequests,
  balanceResponse,
  holdNextResponse,
  renderHome,
  settleRequests,
  spyOnAnnouncements,
  spyOnFocusEvents,
} from '@/test/homeHelpers';

const FIRST_AMOUNT = 'US$ 1.800,00';
const NEW_AMOUNT = 'US$ 2.500,00';
const LOADING = 'Cargando…';
const NETWORK = ERROR_MESSAGES.network;

// Carga la primera cifra y sale a otra pantalla, dejando el Inicio montado debajo.
async function loadAndLeave() {
  await renderHome();
  await settleRequests();
  expect(screen.getByText(FIRST_AMOUNT)).toBeOnTheScreen();

  await act(async () => router.push('/transferencias'));
  expect(screen).toHavePathname('/transferencias');
}

async function goBackHome() {
  await act(async () => router.back());
  expect(screen).toHavePathname('/');
}

describe('HomeScreen: refresco al volver', () => {
  afterEach(jest.restoreAllMocks);

  it('al volver al Inicio pide el saldo sin skeleton, conserva la cifra y la actualiza con la del servidor', async () => {
    await loadAndLeave();
    // La respuesta del refresco queda en espera hasta que el test la suelte.
    const refresh = holdNextResponse();

    await goBackHome();

    expect(balanceRequests()).toHaveLength(2);
    expect(screen.queryByLabelText(LOADING)).not.toBeOnTheScreen();
    expect(screen.getByText(FIRST_AMOUNT)).toBeOnTheScreen();

    refresh.resolve(balanceResponse(2500));
    await settleRequests();

    expect(screen.getByText(NEW_AMOUNT)).toBeOnTheScreen();
    expect(screen.queryByText(FIRST_AMOUNT)).not.toBeOnTheScreen();
    expect(screen.queryByLabelText(LOADING)).not.toBeOnTheScreen();
    expect(balanceRequests()).toHaveLength(2);
  });
});

describe('HomeScreen: accesibilidad del refresco al volver', () => {
  afterEach(jest.restoreAllMocks);

  it.each(['ios', 'android'] as const)('la actualización no se anuncia ni mueve el foco (%s)', async (os) => {
    const announce = spyOnAnnouncements(os);
    const sendEvent = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent');
    await loadAndLeave();
    announce.mockClear();
    sendEvent.mockClear();
    mockApiRoutes({ balance: reply(200, balanceBody(2500, 'USD')), transferList: reply(200, transferListWrapped) });

    await goBackHome();
    await settleRequests();

    expect(screen.getByText(NEW_AMOUNT)).toBeOnTheScreen();
    expect(balanceRequests()).toHaveLength(2);
    expect(announce).not.toHaveBeenCalled();
    expect(sendEvent).not.toHaveBeenCalled();
  });
});

// Deja la cifra con el aviso encima tras un refresco al volver que falla sin red.
async function loadWithNotice() {
  await loadAndLeave();
  mockApiRoutes({ balance: 'networkError', transferList: reply(200, transferListWrapped) });
  await goBackHome();
  await settleRequests();
  expect(screen.getByText(NETWORK)).toBeOnTheScreen();
  expect(screen.getByText(FIRST_AMOUNT)).toBeOnTheScreen();
}

type Trigger = (appState: AppStateCapture) => Promise<void>;

const triggers: [string, Trigger][] = [
  ['pulsar Reintentar', () => fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }))],
  [
    'volver al Inicio',
    async () => {
      await act(async () => router.push('/transferencias'));
      await goBackHome();
    },
  ],
  [
    'volver del segundo plano',
    async (appState) => {
      await appState.emit('background');
      await appState.emit('active');
    },
  ],
];

let appState: AppStateCapture;

// Hay que capturar el estado de la app antes de montar para poder emitir el segundo plano.
function captureAppStateBeforeEach() {
  beforeEach(() => {
    appState = captureAppState();
  });
  afterEach(jest.restoreAllMocks);
}

describe('HomeScreen: refresco con el aviso encima', () => {
  captureAppStateBeforeEach();

  it.each(triggers)(
    'con el aviso encima, mientras pide mantiene el aviso y Reintentar deshabilitado y ocupado (%s)',
    async (_case, trigger) => {
      await loadWithNotice();
      const refresh = holdNextResponse();

      await trigger(appState);

      const retry = screen.getByRole('button', { name: 'Reintentando…' });
      expect(balanceRequests()).toHaveLength(3);
      expect(screen.getByText(NETWORK)).toBeOnTheScreen();
      expect(retry).toBeDisabled();
      expect(retry).toBeBusy();
      expect(screen.getByText('Reintentando…')).toBeOnTheScreen();
      expect(screen.queryByRole('progressbar')).not.toBeOnTheScreen();
      expect(screen.queryByLabelText(LOADING)).not.toBeOnTheScreen();
      expect(screen.getByText(FIRST_AMOUNT)).toBeOnTheScreen();

      refresh.resolve(balanceResponse(2500));
      await settleRequests();
    },
  );
});

describe('HomeScreen: refresco correcto con el aviso encima', () => {
  captureAppStateBeforeEach();

  it.each(triggers)('si responde bien quita el aviso y actualiza la cifra (%s)', async (_case, trigger) => {
    await loadWithNotice();
    const refresh = holdNextResponse();

    await trigger(appState);
    refresh.resolve(balanceResponse(2500));
    await settleRequests();

    expect(screen.queryByText(NETWORK)).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeOnTheScreen();
    expect(screen.getByText(NEW_AMOUNT)).toBeOnTheScreen();
    expect(screen.queryByText(FIRST_AMOUNT)).not.toBeOnTheScreen();
  });
});

// Lanza el disparador con la siguiente respuesta correcta y espera a que se pinte la nueva cifra.
async function refreshOk(trigger: Trigger) {
  mockApiRoutes({ balance: reply(200, balanceBody(2500, 'USD')), transferList: reply(200, transferListWrapped) });
  await trigger(appState);
  await settleRequests();
  expect(screen.getByText(NEW_AMOUNT)).toBeOnTheScreen();
}

const [[, pressRetry], ...silentTriggers] = triggers;

describe('HomeScreen: foco tras Reintentar', () => {
  captureAppStateBeforeEach();

  it('tras Reintentar correcto con cifra previa el foco pasa a la tarjeta', async () => {
    await loadWithNotice();
    const focused = spyOnFocusEvents();

    await refreshOk(pressRetry);

    const card = screen.getByLabelText(/^Saldo disponible:/);
    expect(focused()).toEqual([card.props.accessibilityLabel]);
  });

  it('tras Reintentar correcto sin cifra previa no mueve el foco', async () => {
    await renderHome({ balance: 'networkError' });
    await settleRequests();
    const focused = spyOnFocusEvents();

    await refreshOk(pressRetry);

    expect(focused()).toEqual([]);
  });
});

describe('HomeScreen: foco tras un refresco sin Reintentar', () => {
  captureAppStateBeforeEach();

  it.each(silentTriggers)('con el aviso encima, si responde bien no mueve el foco (%s)', async (_case, trigger) => {
    await loadWithNotice();
    const focused = spyOnFocusEvents();

    await refreshOk(trigger);

    expect(focused()).toEqual([]);
  });
});

describe('HomeScreen: nuevo fallo tras Reintentar', () => {
  afterEach(jest.restoreAllMocks);

  it.each(['ios', 'android'] as const)(
    'si vuelve a fallar con el mismo mensaje reactiva Reintentar y lo anuncia otra vez (%s)',
    async (os) => {
      const announce = spyOnAnnouncements(os);
      await loadWithNotice();
      announce.mockClear();
      mockApiRoutes({ balance: 'networkError', transferList: reply(200, transferListWrapped) });

      await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
      await settleRequests();

      const retry = screen.getByRole('button', { name: 'Reintentar' });
      expect(balanceRequests()).toHaveLength(3);
      expect(retry).toBeEnabled();
      expect(retry).not.toBeBusy();
      expect(screen.getByText(NETWORK)).toBeOnTheScreen();
      expect(announce).toHaveBeenCalledTimes(1);
      expect(announce).toHaveBeenCalledWith(NETWORK);
    },
  );
});
