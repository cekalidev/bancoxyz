import { router } from 'expo-router';
import { act, fireEvent, screen } from 'expo-router/testing-library';

import { exposedStrings } from '@/test/a11yTree';
import { balanceOk, transferListEmpty, transferListWrapped, transferOk } from '@/test/apiFixtures';
import { mockApiRoutes, reply } from '@/test/fetchMock';
import { balanceRequests, balanceResponse, holdNextResponse, settleRequests } from '@/test/homeHelpers';
import { prepareAppTest, renderApp, seedSession } from '@/test/sessionHelpers';
import { LIST_NOW, listRequests, listSession, rowNames, typeSearch } from '@/test/transferListHelpers';
import { applyAmountRange } from '@/test/transferListSheetHelpers';
import { goToConfirm } from '@/test/transferHelpers';

jest.mock('expo-font', () => ({ useFonts: jest.fn(() => [true, null]) }));
jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

const GREETING = `Hola, ${listSession.user.name}`;
const COUNTER = '3 transferencias';
const AMOUNT = 'US$\u00a01.800,00';
const REFRESHED_AMOUNT = 'US$\u00a02.500,00';
const HIDE = 'Ocultar saldo';
const SHOW = 'Mostrar saldo';
const SEARCH = 'Nombre del destinatario';
const EMPTY_TITLE = 'Aún no tienes transferencias';
const ALL_NAMES = ['Ronaldo de Assis Moreira', 'Lionel Andres Messi', 'Federico Valverde'];

const pressButton = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

// Abre la app con la sesión guardada y espera al Inicio con sus peticiones resueltas.
async function openHome() {
  await renderApp('/');
  expect(await screen.findByRole('header', { name: GREETING })).toBeOnTheScreen();
  await settleRequests();
}

// Entra al listado desde el Inicio y espera a que se vean sus filas.
async function openList() {
  await openHome();
  await pressButton('Ver transferencias');
  expect(await screen.findByText(COUNTER)).toBeOnTheScreen();
}

// Entra a un listado vacío, que solo ofrece «Nueva transferencia».
async function openEmptyList() {
  mockApiRoutes({
    balance: reply(200, balanceOk),
    transferList: reply(200, transferListEmpty.direct),
    transfer: reply(200, transferOk),
  });
  await openHome();
  await pressButton('Ver transferencias');
  expect(await screen.findByRole('header', { name: EMPTY_TITLE })).toBeOnTheScreen();
}

const EXITS = [
  { exit: 'Volver', leave: () => pressButton('Volver') },
  { exit: 'atrás del sistema', leave: () => act(() => router.back()) },
];

beforeEach(() => {
  prepareAppTest();
  seedSession(listSession);
  jest.useFakeTimers().setSystemTime(LIST_NOW);
});
afterEach(jest.restoreAllMocks);

describe('entrada al listado desde el Inicio', () => {
  it('Ver transferencias abre el listado con su cabecera Transferencias y Volver', async () => {
    await openHome();

    await pressButton('Ver transferencias');

    expect(screen).toHavePathname('/transferencias');
    expect(await screen.findByText(COUNTER)).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Transferencias' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Volver' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).toBeNull();
  });
});

describe('el Inicio sigue igual con el listado', () => {
  it('dos pulsaciones seguidas de Ver transferencias abren un solo listado', async () => {
    await openHome();

    // Las dos pulsaciones llegan en el mismo tick, antes de que cambie la pantalla.
    const button = screen.getByRole('button', { name: 'Ver transferencias' });
    await act(async () => {
      await Promise.all([fireEvent.press(button), fireEvent.press(button)]);
    });
    await settleRequests();

    expect(screen).toHavePathname('/transferencias');
    expect(listRequests()).toHaveLength(1);
    await pressButton('Volver');
    expect(screen).toHavePathname('/');
    expect(router.canGoBack()).toBe(false);
  });
});

describe('el Inicio al volver del listado', () => {
  it.each(EXITS)('Volver o atrás llevan al Inicio, que pide el saldo en silencio', async ({ leave }) => {
    await openList();
    const refresh = holdNextResponse();

    await leave();

    expect(screen).toHavePathname('/');
    expect(router.canGoBack()).toBe(false);
    expect(balanceRequests()).toHaveLength(2);
    expect(screen.getByText(AMOUNT)).toBeOnTheScreen();
    expect(screen.queryByLabelText('Cargando…')).toBeNull();
    await act(async () => refresh.resolve(balanceResponse(2500)));
    await settleRequests();
    expect(screen.getByText(REFRESHED_AMOUNT)).toBeOnTheScreen();
    expect(screen.queryByText(AMOUNT)).toBeNull();
  });

  it('el listado no tiene ojo y no cambia el del Inicio', async () => {
    await openHome();
    await pressButton(HIDE);
    expect(screen.queryByText(AMOUNT)).toBeNull();

    await pressButton('Ver transferencias');
    expect(await screen.findByText(COUNTER)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: HIDE })).toBeNull();
    expect(screen.queryByRole('button', { name: SHOW })).toBeNull();
    await pressButton('Volver');
    await settleRequests();

    expect(screen).toHavePathname('/');
    expect(screen.getByRole('button', { name: SHOW })).toBeOnTheScreen();
    expect(screen.queryByText(AMOUNT)).toBeNull();
  });
});

describe('los filtros del listado no sobreviven a la salida', () => {
  it.each(EXITS)('al volver al Inicio y entrar de nuevo la búsqueda está vacía y los chips sin aplicar', async ({ leave }) => {
    await openList();
    await typeSearch('mes');
    await applyAmountRange('2.000,00', '4.000,00');
    expect(screen.getByText('1 de 3 transferencias')).toBeOnTheScreen();

    await leave();
    await settleRequests();
    expect(screen).toHavePathname('/');
    await pressButton('Ver transferencias');
    expect(await screen.findByText(COUNTER)).toBeOnTheScreen();

    expect(screen.getByLabelText(SEARCH)).toHaveDisplayValue('');
    expect(screen.getByRole('button', { name: 'Filtro de valor: sin aplicar' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Filtro de fecha: sin aplicar' })).toBeOnTheScreen();
    expect(rowNames()).toEqual(ALL_NAMES);
  });
});

describe('Nueva transferencia desde el listado vacío', () => {
  it.each(EXITS)('Nueva transferencia del vacío abre el formulario y Volver o atrás regresan al listado', async ({ leave }) => {
    await openEmptyList();

    await pressButton('Nueva transferencia');
    await settleRequests();
    expect(screen).toHavePathname('/nueva-transferencia');
    expect(screen.getByRole('header', { name: 'Nueva transferencia' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Valor')).toBeOnTheScreen();

    await leave();
    await settleRequests();

    expect(screen).toHavePathname('/transferencias');
    expect(screen.getByRole('header', { name: EMPTY_TITLE })).toBeOnTheScreen();
    await act(() => router.back());
    expect(screen).toHavePathname('/');
  });

  it('el resultado de una transferencia vuelve al Inicio con el listado cerrado', async () => {
    await openEmptyList();
    await pressButton('Nueva transferencia');
    await settleRequests();
    await goToConfirm();
    await pressButton('Confirmar transferencia');
    await settleRequests();
    expect(screen).toHavePathname('/nueva-transferencia/resultado');
    expect(screen.getByRole('header', { name: 'Transferencia realizada' })).toBeOnTheScreen();

    await act(() => router.back());
    await settleRequests();

    expect(screen).toHavePathname('/');
    expect(router.canGoBack()).toBe(false);
    expect(screen.queryByRole('header', { name: EMPTY_TITLE })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ver transferencias' })).toBeOnTheScreen();
  });
});

describe('el listado tras una transferencia', () => {
  it('tras una transferencia el listado muestra solo lo que devuelve el servidor', async () => {
    mockApiRoutes({
      balance: reply(200, balanceOk),
      transferList: reply(200, transferListWrapped),
      transfer: reply(200, transferOk),
    });
    await openHome();
    await pressButton('Nueva transferencia');
    await settleRequests();
    await goToConfirm();
    await pressButton('Confirmar transferencia');
    await settleRequests();
    expect(screen.getByRole('header', { name: 'Transferencia realizada' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Ver transferencias' })).toBeNull();
    expect(exposedStrings().filter((text) => /listado|aparecer/i.test(text))).toEqual([]);

    await pressButton('Volver al inicio');
    await settleRequests();
    await pressButton('Ver transferencias');

    expect(await screen.findByText(COUNTER)).toBeOnTheScreen();
    expect(rowNames()).toEqual(ALL_NAMES);
    expect(screen.queryByText(/1\.250/)).toBeNull();
    expect(listRequests()).toHaveLength(1);
  });
});
