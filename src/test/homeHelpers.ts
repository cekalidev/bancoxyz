import { Stack } from 'expo-router';
import { act, renderRouter, screen, within } from 'expo-router/testing-library';
import { createElement } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

import { connectApiToSession } from '@/features/auth';
import { useSessionStore } from '@/features/auth/sessionStore';
import { HomeScreen } from '@/features/home';
import { NewTransferScreen, TransfersScreen } from '@/features/transfers';
import { API_URLS } from '@/services/api/endpoints';
import type { Session } from '@/services/api/types';

import { balanceBody, balanceOk, loginOk } from './apiFixtures';
import { defer } from './defer';
import { mockApiRoutes, reply, type Reply } from './fetchMock';
import { resetSessionStore } from './sessionHelpers';

type RenderHomeOptions = { session?: Session; balance?: Reply };

export const homeSession: Session = loginOk;

// Pila sin cabecera: el Inicio sigue montado debajo de los destinos y vuelve a enfocarse al regresar.
function HomeTestStack() {
  return createElement(Stack, { screenOptions: { headerShown: false } });
}

// Monta el Inicio con el navegador real, una sesión activa y el saldo simulado en la red.
// Parte de un store limpio; los mocks se deshacen con `afterEach(jest.restoreAllMocks)`.
export function renderHome({ session = homeSession, balance = reply(200, balanceOk) }: RenderHomeOptions = {}) {
  resetSessionStore();
  useSessionStore.setState({ session });
  connectApiToSession();
  mockApiRoutes({ balance });
  return renderRouter(
    {
      _layout: HomeTestStack,
      index: HomeScreen,
      'nueva-transferencia': NewTransferScreen,
      transferencias: TransfersScreen,
    },
    { initialUrl: '/' },
  );
}

// Respuesta correcta del saldo con el importe dado, en dólares.
export function balanceResponse(amount: number) {
  return new Response(JSON.stringify(balanceBody(amount, 'USD')), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Retiene la siguiente respuesta del saldo hasta que el test la suelte.
export function holdNextResponse() {
  const refresh = defer<Response>();
  jest.mocked(global.fetch).mockImplementation(() => refresh.promise);
  return refresh;
}

export function balanceRequests() {
  return jest.mocked(global.fetch).mock.calls.filter(([input]) => String(input) === API_URLS.balance);
}

// Deja que terminen las respuestas simuladas y las actualizaciones que provocan.
export async function settleRequests() {
  await act(async () => {
    await Promise.allSettled(jest.mocked(global.fetch).mock.results.map((result) => result.value));
    await jest.advanceTimersByTimeAsync(0);
  });
}

// Fija la plataforma y espía los anuncios manuales del lector de pantalla.
export function spyOnAnnouncements(os: 'ios' | 'android' = 'ios') {
  jest.replaceProperty(Platform, 'OS', os);
  return jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockClear();
}

// Región que se anuncia sola (Android) y contiene el mensaje, si la hay.
export function politeRegionWith(message: string) {
  return screen.container
    .queryAll((node) => node.props.accessibilityLiveRegion === 'polite')
    .find((region) => within(region).queryByText(message) !== null);
}

type Labelled = { props: { accessibilityLabel?: string } };

function hasProps(node: unknown): node is Labelled {
  return typeof node === 'object' && node !== null && 'props' in node;
}

// Etiquetas de los nodos a los que se pidió mover el foco del lector de pantalla.
export function spyOnFocusEvents() {
  const sendEvent = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockClear();
  return () =>
    sendEvent.mock.calls
      .filter(([, type]) => type === 'focus')
      .map(([node]) => (hasProps(node) ? node.props.accessibilityLabel : undefined));
}
