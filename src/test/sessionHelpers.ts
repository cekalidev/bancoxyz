import { renderRouter, screen } from 'expo-router/testing-library';
import type { ReactElement } from 'react';

import { LoginScreen } from '@/features/auth';
import { HomeScreen } from '@/features/home';
import { connectApiToSession } from '@/features/auth/connectApi';
import { INITIAL_SESSION_STATE, useSessionStore } from '@/features/auth/sessionStore';
import { NotFoundScreen, RootLayout } from '@/features/shell';
import { TransferListScreen } from '@/features/transfer-list';
import { ConfirmTransferScreen, NewTransferScreen, TransferResultScreen } from '@/features/transfers';
import { resetTransfers } from '@/features/transfers/transferActions';
import type { Session } from '@/services/api/types';

import { balanceOk, transferListWrapped } from './apiFixtures';
import { mockApiRoutes, reply } from './fetchMock';
import { seedStoredValue } from './secureStoreMock';

export function resetSessionStore(): void {
  useSessionStore.setState(INITIAL_SESSION_STATE, true);
}

export function seedSession(session: Session): void {
  seedStoredValue(JSON.stringify(session));
}

// Se registra con `beforeEach(prepareSessionTest)` en los tests de pantallas y de navegación.
export function prepareSessionTest(): void {
  resetSessionStore();
  resetTransfers();
  connectApiToSession();
}

// Como `prepareSessionTest`, y además el saldo y el listado responden con éxito para los tests que abren el Inicio.
export function prepareAppTest(): void {
  prepareSessionTest();
  mockApiRoutes({ balance: reply(200, balanceOk), transferList: reply(200, transferListWrapped) });
}

type ScreenStub = () => ReactElement | null;

// `login` y `home` se pueden sustituir: un envoltorio que cuenta montajes o una pantalla de prueba sin red.
export function renderApp(initialUrl: string, login: ScreenStub = LoginScreen, home: ScreenStub = HomeScreen) {
  return renderRouter(
    {
      _layout: RootLayout,
      index: home,
      login,
      'nueva-transferencia/index': NewTransferScreen,
      'nueva-transferencia/confirmar': ConfirmTransferScreen,
      'nueva-transferencia/resultado': TransferResultScreen,
      transferencias: TransferListScreen,
      '+not-found': NotFoundScreen,
    },
    { initialUrl },
  );
}

// Simula cerrar y reabrir la app: se pierde la memoria y se conserva el almacenamiento seguro.
export async function relaunchApp(initialUrl: string, home: ScreenStub = HomeScreen) {
  await screen.unmount();
  resetSessionStore();
  resetTransfers();
  return renderApp(initialUrl, LoginScreen, home);
}
