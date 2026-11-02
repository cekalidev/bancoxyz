import { router } from 'expo-router';
import { act, fireEvent, screen } from 'expo-router/testing-library';

import { captureAppState, type AppStateCapture } from '@/test/appStateMock';
import {
  balanceRequests,
  balanceResponse,
  holdFirstLoad,
  holdNextResponse,
  renderHome,
  settleRequests,
} from '@/test/homeHelpers';

const AMOUNT = 'US$ 1.800,00';

async function leaveAndComeBack() {
  await act(async () => router.push('/transferencias'));
  expect(screen).toHavePathname('/transferencias');
  await act(async () => router.back());
  expect(screen).toHavePathname('/');
}

let appState: AppStateCapture;

beforeEach(() => {
  appState = captureAppState();
});

afterEach(jest.restoreAllMocks);

describe('HomeScreen: una sola petición de saldo a la vez', () => {
  it('con una petición en curso ignora volver, segundo plano y varios Reintentar', async () => {
    await renderHome({ balance: 'networkError' });
    await settleRequests();
    expect(balanceRequests()).toHaveLength(1);
    const pending = holdNextResponse();

    // Las tres pulsaciones llegan en el mismo tick, antes de que el botón se deshabilite.
    const retry = screen.getByRole('button', { name: 'Reintentar' });
    await act(async () => {
      await Promise.all([fireEvent.press(retry), fireEvent.press(retry), fireEvent.press(retry)]);
    });
    await leaveAndComeBack();
    await appState.emit('background');
    await appState.emit('active');

    expect(balanceRequests()).toHaveLength(2);

    pending.resolve(balanceResponse(1800));
    await settleRequests();
    expect(balanceRequests()).toHaveLength(2);
  });
});

describe('HomeScreen: una sola petición al entrar y al volver', () => {
  it('al entrar envía una sola petición, no una por montar y otra por el foco', async () => {
    await renderHome();
    await settleRequests();

    expect(balanceRequests()).toHaveLength(1);
    expect(screen.getByText(AMOUNT)).toBeOnTheScreen();
  });

  it('si salgo y vuelvo antes de que responda no pide otra y muestra su resultado', async () => {
    // La primera respuesta queda en espera; el montaje fija después las demás respuestas de la red.
    const pending = holdFirstLoad();
    await renderHome();
    expect(balanceRequests()).toHaveLength(1);

    await leaveAndComeBack();
    expect(balanceRequests()).toHaveLength(1);

    pending.resolve(balanceResponse(1800));
    await settleRequests();

    expect(balanceRequests()).toHaveLength(1);
    expect(screen.getByText(AMOUNT)).toBeOnTheScreen();
  });
});
