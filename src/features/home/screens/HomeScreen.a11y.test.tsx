import { router } from 'expo-router';
import { act, fireEvent, screen } from 'expo-router/testing-library';
import { Animated, StyleSheet } from 'react-native';
import { inspect } from 'util';

import { ERROR_MESSAGES } from '@/services/api/errors';
import { accessibleOrder, exposedStrings } from '@/test/a11yTree';
import { balanceBody, sessionUnauthorized, transferListWrapped } from '@/test/apiFixtures';
import { defer } from '@/test/defer';
import { mockApiRoutes, reply, type Reply } from '@/test/fetchMock';
import { balanceResponse, homeSession, renderHome, settleRequests } from '@/test/homeHelpers';
import { mockReducedMotion } from '@/test/reducedMotion';

const GREETING = 'Hola, Gabriel Topaz';
const CARD = 'Saldo disponible: 1.800,00 dólares';
const AMOUNT = 'US$ 1.800,00';
const NETWORK = ERROR_MESSAGES.network;
const ACTIONS = ['Nueva transferencia', 'Ver transferencias'];

async function loadAmount() {
  await renderHome();
  await settleRequests();
}

// Con la cifra ya cargada, vuelve al Inicio con un refresco fallido: aviso encima de la tarjeta.
async function failRefreshOnReturn(balance: Reply) {
  await act(async () => router.push('/transferencias'));
  mockApiRoutes({ balance, transferList: reply(200, transferListWrapped) });
  await act(async () => router.back());
  await settleRequests();
}

// Posición del nodo en el recorrido del árbol, que es el orden de lectura.
function treeIndex(text: string) {
  return screen.container.queryAll(() => true).indexOf(screen.getByText(text));
}

function expectActionButtons() {
  expect(screen.getByRole('button', { name: 'Nueva transferencia' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Ver transferencias' })).toBeOnTheScreen();
}

describe('HomeScreen: roles y etiquetas para el lector de pantalla', () => {
  afterEach(jest.restoreAllMocks);

  it('cada control del Inicio tiene rol de botón y etiqueta en español y el saludo es encabezado', async () => {
    await loadAmount();
    await failRefreshOnReturn('networkError');

    expect(screen.getByRole('header', { name: GREETING })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeOnTheScreen();
    expectActionButtons();

    await fireEvent.press(screen.getByRole('button', { name: 'Ocultar saldo' }));
    expect(screen.getByRole('button', { name: 'Mostrar saldo' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Ocultar saldo' })).not.toBeOnTheScreen();
  });
});

describe('HomeScreen: orden de lectura', () => {
  afterEach(jest.restoreAllMocks);

  it('el orden de lectura es saludo, aviso, tarjeta, ojo y los dos botones', async () => {
    await loadAmount();
    expect(accessibleOrder()).toEqual([GREETING, CARD, 'Ocultar saldo', ...ACTIONS]);

    await failRefreshOnReturn('networkError');
    expect(accessibleOrder()).toEqual([GREETING, 'Reintentar', CARD, 'Ocultar saldo', ...ACTIONS]);
    // El texto del aviso no tiene rol ni es un elemento accesible propio, así que se comprueba por posición.
    expect(treeIndex(NETWORK)).toBeGreaterThan(treeIndex(GREETING));
    expect(treeIndex(NETWORK)).toBeLessThan(treeIndex(AMOUNT));
  });

  it('con el aviso de primera carga el orden es saludo, aviso y los dos botones', async () => {
    await renderHome({ balance: 'networkError' });
    await settleRequests();

    expect(accessibleOrder()).toEqual([GREETING, 'Reintentar', ...ACTIONS]);
    // El texto del aviso no tiene rol, así que su lugar tras el saludo se comprueba por posición.
    expect(treeIndex(NETWORK)).toBeGreaterThan(treeIndex(GREETING));
    expect(treeIndex(NETWORK)).toBeLessThan(treeIndex('Reintentar'));
  });
});

describe('HomeScreen: reducción de movimiento', () => {
  afterEach(jest.restoreAllMocks);

  it('con reducción de movimiento el skeleton del Inicio no se anima', async () => {
    mockReducedMotion(true);
    const start = jest.fn();
    jest.spyOn(Animated, 'loop').mockImplementation(
      () => ({ start, stop: jest.fn(), reset: jest.fn() }) as unknown as Animated.CompositeAnimation,
    );
    const firstLoad = holdFirstLoad();
    await renderHome();
    // Deja que se lea la preferencia del sistema con la carga aún en curso.
    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByLabelText('Cargando…')).toBeOnTheScreen();
    const blocks = screen.getByTestId('balance-skeleton-blocks', { includeHiddenElements: true }).children;
    const opacities = blocks.map(
      (node) => typeof node !== 'string' && StyleSheet.flatten(node.props.style).opacity,
    );
    expect(opacities).toEqual([1, 1]);
    expect(start).not.toHaveBeenCalled();

    firstLoad.resolve(balanceResponse(1800));
    await settleRequests();
    expect(screen.getByText(AMOUNT)).toBeOnTheScreen();
  });
});

// Retiene la respuesta de la primera carga: la implementación de una sola vez gana a la que pone `renderHome`.
function holdFirstLoad() {
  const firstLoad = defer<Response>();
  jest.spyOn(global, 'fetch').mockImplementationOnce(() => firstLoad.promise);
  return firstLoad;
}

const CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'debug'] as const;
const AMOUNT_TRACES = /1800|1\.800|2500|2\.500/;

function spyOnConsole() {
  return CONSOLE_METHODS.map((method) => jest.spyOn(console, method).mockImplementation(() => undefined));
}

// Ni los registros ni el árbol (también lo oculto al lector) delatan la sesión; los registros tampoco el importe.
function expectNoLeaks(spies: jest.SpyInstance[]) {
  const logged = spies.flatMap((spy) =>
    spy.mock.calls.map((args) => args.map((arg: unknown) => inspect(arg)).join(' ')),
  );
  for (const line of logged) {
    expect(line).not.toContain(homeSession.token);
    expect(line).not.toMatch(AMOUNT_TRACES);
  }
  expect(exposedStrings().filter((text) => text.includes(homeSession.token))).toEqual([]);
}

const firstLoadErrors: [string, Reply][] = [
  ['sin red', 'networkError'],
  ['400', reply(400, { message: 'Solicitud inválida' })],
  ['401', reply(401, sessionUnauthorized)],
  ['500', reply(500, { message: 'Error interno' })],
  ['cuerpo no JSON', { raw: '<html>Error interno</html>', status: 200 }],
  ['forma inesperada', reply(200, { currency: 'usd', accountBalance: '1800' })],
];

describe('HomeScreen: el token y el importe no se filtran', () => {
  afterEach(jest.restoreAllMocks);

  it('en carga, refresco, éxito y cada error no registra el token ni el importe y el token no aparece en la interfaz: carga y refrescos', async () => {
    const spies = spyOnConsole();
    const firstLoad = holdFirstLoad();
    await renderHome();
    expectNoLeaks(spies);

    firstLoad.resolve(balanceResponse(1800));
    await settleRequests();
    expect(screen.getByText(AMOUNT)).toBeOnTheScreen();
    expectNoLeaks(spies);

    await act(async () => router.push('/transferencias'));
    mockApiRoutes({ balance: reply(200, balanceBody(2500, 'USD')), transferList: reply(200, transferListWrapped) });
    await act(async () => router.back());
    await settleRequests();
    expect(screen.getByText('US$\u00a02.500,00')).toBeOnTheScreen();
    expectNoLeaks(spies);

    await failRefreshOnReturn('networkError');
    expect(screen.getByText(NETWORK)).toBeOnTheScreen();
    expectNoLeaks(spies);
  });

  it.each(firstLoadErrors)(
    'en carga, refresco, éxito y cada error no registra el token ni el importe y el token no aparece en la interfaz: primera carga fallida (%s)',
    async (_case, balance) => {
      const spies = spyOnConsole();
      await renderHome({ balance });
      await settleRequests();

      expectNoLeaks(spies);
    },
  );
});
