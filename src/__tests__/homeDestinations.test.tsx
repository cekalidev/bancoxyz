import { router } from 'expo-router';
import { act, fireEvent, screen, testRouter } from 'expo-router/testing-library';

import type { Session } from '@/services/api/types';
import { accessibleOrder } from '@/test/a11yTree';
import { balanceBody } from '@/test/apiFixtures';
import { mockApiRoutes, reply } from '@/test/fetchMock';
import { balanceRequests, settleRequests } from '@/test/homeHelpers';
import { prepareAppTest, renderApp, seedSession } from '@/test/sessionHelpers';

jest.mock('expo-font', () => ({ useFonts: jest.fn(() => [true, null]) }));

const COUNTER = '3 transferencias';
const SEARCH_LABEL = 'Nombre del destinatario';
const AMOUNT_CHIP_LABEL = 'Filtro de valor: sin aplicar';
const DATE_CHIP_LABEL = 'Filtro de fecha: sin aplicar';
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

const destinations = [{ path: '/transferencias', title: 'Transferencias' }];

function nodesOfType(types: string[]) {
  return screen.container.queryAll((node) => types.includes(String(node.type)));
}

// Posición del nodo en el recorrido del árbol, que es el orden de lectura.
function treeIndex(node: ReturnType<typeof screen.getByText>) {
  return screen.container.queryAll(() => true).indexOf(node);
}

// Abre el destino directamente y espera a que se pinte su contenido.
async function openDestination(path: string) {
  await renderApp(path);
  expect(await screen.findByText(COUNTER)).toBeOnTheScreen();
}

beforeEach(prepareAppTest);
afterEach(jest.restoreAllMocks);

describe('destinos con sesión', () => {
  beforeEach(() => seedSession(session));

  it.each(destinations)(
    'cada destino muestra Volver, su título y su contenido, sin Salir ni otras acciones ($path)',
    async ({ path, title }) => {
      await renderApp(path);

      expect(await screen.findByText(COUNTER)).toBeOnTheScreen();
      expect(screen).toHavePathname(path);
      expect(screen.getByRole('header', { name: title })).toBeOnTheScreen();
      expect(screen.getByLabelText(SEARCH_LABEL)).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Volver' })).toBeOnTheScreen();
      // Además de Volver, solo los chips de filtro Valor y Fecha.
      expect(screen.getByRole('button', { name: AMOUNT_CHIP_LABEL })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: DATE_CHIP_LABEL })).toBeOnTheScreen();
      expect(screen.getAllByRole('button')).toHaveLength(3);
      expect(screen.queryByText('Salir')).toBeNull();
      expect(screen.queryByLabelText('Cerrar sesión')).toBeNull();
    },
  );
});

describe('destinos: carga y roles', () => {
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
    'en los destinos Volver es un botón y el título es encabezado ($path)',
    async ({ path, title }) => {
      await openDestination(path);

      expect(screen.getByRole('button', { name: 'Volver' })).toBeOnTheScreen();
      expect(screen.getByRole('header', { name: title })).toBeOnTheScreen();
      // El logo es decorativo: el lector no lo anuncia.
      expect(accessibleOrder()).not.toContain('BancoXYZ');
    },
  );
});

describe('orden de lectura de la cabecera y los destinos', () => {
  beforeEach(() => seedSession(session));

  it.each(destinations)(
    'en los destinos se lee Volver, título, búsqueda y chips ($path)',
    async ({ path, title }) => {
      await openDestination(path);

      expect(accessibleOrder().slice(0, 4)).toEqual(['Volver', title, AMOUNT_CHIP_LABEL, DATE_CHIP_LABEL]);
      // El campo de búsqueda y el contador no entran en ese recorrido, así que se comprueban por posición.
      const search = treeIndex(screen.getByLabelText(SEARCH_LABEL));
      expect(search).toBeGreaterThan(treeIndex(screen.getByRole('header', { name: title })));
      expect(search).toBeLessThan(treeIndex(screen.getByRole('button', { name: AMOUNT_CHIP_LABEL })));
      expect(treeIndex(screen.getByText(COUNTER))).toBeGreaterThan(
        treeIndex(screen.getByRole('button', { name: DATE_CHIP_LABEL })),
      );
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
