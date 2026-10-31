import { router } from 'expo-router';
import { act, fireEvent, screen, testRouter } from 'expo-router/testing-library';

import type { Session } from '@/services/api/types';
import { accessibleOrder } from '@/test/a11yTree';
import { balanceBody } from '@/test/apiFixtures';
import { mockApiRoutes, reply } from '@/test/fetchMock';
import { balanceRequests, settleRequests } from '@/test/homeHelpers';
import { prepareAppTest, renderApp, seedSession } from '@/test/sessionHelpers';

jest.mock('expo-font', () => ({ useFonts: jest.fn(() => [true, null]) }));

const COMING_SOON = 'Disponible pronto';
const COMING_SOON_TEXT = 'Esta sección estará lista en breve.';
const GREETING = 'Hola, Ana Prueba';
const FIRST_AMOUNT = 'US$\u00a01.800,00';
const NEW_AMOUNT = 'US$\u00a02.500,00';
const SCROLL_TYPES = ['RCTScrollView'];
const REFRESH_TYPES = ['RCTRefreshControl', 'AndroidSwipeRefreshLayout'];
const SPINNER_TYPES = ['RCTActivityIndicatorView', 'AndroidProgressBar', 'ActivityIndicator'];

const session: Session = {
  token: 'token-de-prueba',
  user: { id: 7, name: 'Ana Prueba', email: 'ana@ejemplo.com' },
};

const destinations = [
  { path: '/nueva-transferencia', title: 'Nueva transferencia' },
  { path: '/transferencias', title: 'Transferencias' },
];

function nodesOfType(types: string[]) {
  return screen.container.queryAll((node) => types.includes(String(node.type)));
}

// Posición del nodo en el recorrido del árbol, que es el orden de lectura.
function treeIndex(text: string) {
  return screen.container.queryAll(() => true).indexOf(screen.getByText(text));
}

// Abre el destino directamente y espera a que se pinte su contenido.
async function openDestination(path: string) {
  await renderApp(path);
  expect(await screen.findByRole('header', { name: COMING_SOON })).toBeOnTheScreen();
}

beforeEach(prepareAppTest);
afterEach(jest.restoreAllMocks);

describe('destinos provisionales con sesión', () => {
  beforeEach(() => seedSession(session));

  it.each(destinations)(
    'cada destino muestra Volver, su título y Disponible pronto, sin Salir ni otras acciones ($path)',
    async ({ path, title }) => {
      await renderApp(path);

      expect(await screen.findByRole('header', { name: COMING_SOON })).toBeOnTheScreen();
      expect(screen).toHavePathname(path);
      expect(screen.getByRole('header', { name: title })).toBeOnTheScreen();
      expect(screen.getByText(COMING_SOON_TEXT)).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Volver' })).toBeOnTheScreen();
      expect(screen.getAllByRole('button')).toHaveLength(1);
      expect(screen.queryByText('Salir')).toBeNull();
      expect(screen.queryByLabelText('Cerrar sesión')).toBeNull();
    },
  );
});

describe('destinos provisionales: carga y roles', () => {
  beforeEach(() => seedSession(session));

  it.each(destinations)('los destinos no tienen indicador de carga ni recarga ($path)', async ({ path }) => {
    await openDestination(path);

    for (const scrollView of nodesOfType(SCROLL_TYPES)) {
      expect(scrollView.props.refreshControl).toBeUndefined();
      expect(scrollView.props.onRefresh).toBeUndefined();
    }
    expect(nodesOfType(REFRESH_TYPES)).toHaveLength(0);
    expect(screen.queryByRole('progressbar')).not.toBeOnTheScreen();
    expect(nodesOfType(SPINNER_TYPES)).toHaveLength(0);
  });

  it.each(destinations)(
    'en los destinos Volver es un botón y el título y Disponible pronto son encabezados ($path)',
    async ({ path, title }) => {
      await openDestination(path);

      expect(screen.getByRole('button', { name: 'Volver' })).toBeOnTheScreen();
      expect(screen.getByRole('header', { name: title })).toBeOnTheScreen();
      expect(screen.getByRole('header', { name: COMING_SOON })).toBeOnTheScreen();
      // El logo es decorativo: el lector no lo anuncia.
      expect(accessibleOrder()).not.toContain('BancoXYZ');
    },
  );
});

describe('orden de lectura de la cabecera y los destinos', () => {
  beforeEach(() => seedSession(session));

  it.each(destinations)(
    'en los destinos se lee Volver, título, Disponible pronto y el texto ($path)',
    async ({ path, title }) => {
      await openDestination(path);

      expect(accessibleOrder()).toEqual(['Volver', title, COMING_SOON]);
      // El texto no tiene rol ni es un elemento accesible propio, así que se comprueba por posición.
      expect(treeIndex(COMING_SOON_TEXT)).toBeGreaterThan(treeIndex(COMING_SOON));
    },
  );

  it('la cabecera del Inicio se lee antes que el saludo', async () => {
    await renderApp('/');
    expect(await screen.findByRole('header', { name: GREETING })).toBeOnTheScreen();
    await settleRequests();

    const order = accessibleOrder();
    // Logo, título y Salir, en ese orden, antes que el saludo.
    expect(order.slice(0, order.indexOf(GREETING))).toEqual(['BancoXYZ', 'BancoXYZ', 'Cerrar sesión']);
  });
});

// Abre el Inicio con la primera cifra cargada y entra al destino, dejando el Inicio debajo en la pila.
async function openDestinationFromHome(path: string) {
  await renderApp('/');
  expect(await screen.findByRole('header', { name: GREETING })).toBeOnTheScreen();
  await settleRequests();
  expect(screen.getByText(FIRST_AMOUNT)).toBeOnTheScreen();

  await act(async () => router.push(path));
  expect(screen).toHavePathname(path);
}

describe('volver al Inicio desde los destinos', () => {
  beforeEach(() => seedSession(session));

  it.each(destinations)('Volver lleva al Inicio y refresca el saldo ($path)', async ({ path }) => {
    await openDestinationFromHome(path);
    mockApiRoutes({ balance: reply(200, balanceBody(2500, 'USD')) });

    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    await settleRequests();

    expect(screen).toHavePathname('/');
    expect(screen.getByText(NEW_AMOUNT)).toBeOnTheScreen();
    expect(balanceRequests()).toHaveLength(2);
    // Volver retrocede en la pila: no apila un segundo Inicio encima del primero.
    expect(router.canGoBack()).toBe(false);
  });

  it.each(destinations)('atrás del sistema desde un destino vuelve al Inicio ($path)', async ({ path }) => {
    await openDestinationFromHome(path);

    await testRouter.back('/');
    await settleRequests();

    expect(screen).toHavePathname('/');
    expect(screen.getByRole('header', { name: GREETING })).toBeOnTheScreen();
  });

  it('en el Inicio no hay pantalla anterior a la que volver', async () => {
    await renderApp('/');
    expect(await screen.findByRole('header', { name: GREETING })).toBeOnTheScreen();
    await settleRequests();

    expect(screen).toHavePathname('/');
    expect(router.canGoBack()).toBe(false);
  });
});
