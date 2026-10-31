import { router } from 'expo-router';
import { act, screen } from 'expo-router/testing-library';

import { API_URLS } from '@/services/api/endpoints';
import { ERROR_MESSAGES } from '@/services/api/errors';
import { balanceBody } from '@/test/apiFixtures';
import { defer } from '@/test/defer';
import { reply } from '@/test/fetchMock';
import { balanceResponse, holdNextResponse, renderHome } from '@/test/homeHelpers';

const SPINNER_TYPES = ['RCTActivityIndicatorView', 'AndroidProgressBar', 'ActivityIndicator'];

const session = {
  token: 'token-de-prueba',
  user: { id: 7, name: 'Lucía Fernández', email: 'lucia@ejemplo.com' },
};

// Nombre de 80 caracteres con varias palabras: no cabe en una línea y debe verse completo.
const LONG_NAME = `${'Ana '.repeat(19)}Anas`;
const longSession = { ...session, user: { ...session.user, name: LONG_NAME } };

function querySpinners() {
  return screen.container.queryAll((node) => SPINNER_TYPES.includes(String(node.type)));
}

function balanceRequests() {
  return jest.mocked(global.fetch).mock.calls.filter(([input]) => String(input) === API_URLS.balance);
}

// Deja que terminen las respuestas simuladas y las actualizaciones que provocan.
async function settleRequests() {
  await act(async () => {
    await Promise.allSettled(jest.mocked(global.fetch).mock.results.map((result) => result.value));
    await jest.advanceTimersByTimeAsync(0);
  });
}

describe('HomeScreen: carga', () => {
  afterEach(jest.restoreAllMocks);

  it('al entrar muestra el saludo, el skeleton del saldo y los dos botones, sin indicador giratorio', async () => {
    await renderHome({ session, balance: 'pending' });

    expect(screen.getByRole('header', { name: 'Hola, Lucía Fernández' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Cargando…')).toBeBusy();
    for (const name of ['Nueva transferencia', 'Ver transferencias']) {
      const button = screen.getByRole('button', { name });
      expect(button).toBeEnabled();
      expect(button).not.toBeBusy();
    }
    expect(screen.queryByRole('progressbar')).not.toBeOnTheScreen();
    expect(querySpinners()).toHaveLength(0);
  });

  it('al entrar pide el saldo una sola vez', async () => {
    await renderHome({ session });
    await settleRequests();

    expect(balanceRequests()).toHaveLength(1);
  });
});

describe('HomeScreen: saldo recibido', () => {
  afterEach(jest.restoreAllMocks);

  it('con la respuesta sustituye el skeleton por la tarjeta con US$\u00a01.800,00', async () => {
    await renderHome({ session, balance: reply(200, balanceBody(1800, 'USD')) });
    await settleRequests();

    expect(screen.queryByLabelText('Cargando…')).not.toBeOnTheScreen();
    expect(screen.getByText('Saldo disponible')).toBeOnTheScreen();
    expect(screen.getByText('US$\u00a01.800,00')).toBeOnTheScreen();
  });

  it.each([
    [0, 'US$\u00a00,00'],
    [-150, '-US$\u00a0150,00'],
  ])('un saldo de %d se muestra como cualquier otro, sin aviso', async (amount, expected) => {
    await renderHome({ session, balance: reply(200, balanceBody(amount, 'USD')) });
    await settleRequests();

    expect(screen.getByText(expected)).toBeOnTheScreen();
    expect(screen.queryByLabelText('Cargando…')).not.toBeOnTheScreen();
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
    for (const message of Object.values(ERROR_MESSAGES)) {
      expect(screen.queryByText(message)).not.toBeOnTheScreen();
    }
  });
});

type Release = () => Promise<void>;

const nothingToRelease: Release = async () => undefined;

// Retiene la respuesta de la primera carga: la implementación de una sola vez gana a la que pone `renderHome`.
function holdFirstLoad() {
  const firstLoad = defer<Response>();
  jest.spyOn(global, 'fetch').mockImplementationOnce(() => firstLoad.promise);
  return firstLoad;
}

async function showLoading(): Promise<Release> {
  const firstLoad = holdFirstLoad();
  await renderHome({ session: longSession });
  return async () => {
    firstLoad.resolve(balanceResponse(1800));
    await settleRequests();
  };
}

async function showFirstLoadError(): Promise<Release> {
  await renderHome({ session: longSession, balance: 'networkError' });
  await settleRequests();
  return nothingToRelease;
}

async function showAmount(): Promise<Release> {
  await renderHome({ session: longSession });
  await settleRequests();
  return nothingToRelease;
}

// Con la cifra cargada, vuelve al Inicio y deja el refresco en curso sin respuesta.
async function showRefreshing(): Promise<Release> {
  await showAmount();
  await act(async () => router.push('/transferencias'));
  const refresh = holdNextResponse();
  await act(async () => router.back());
  await act(async () => {
    await jest.advanceTimersByTimeAsync(0);
  });
  expect(balanceRequests()).toHaveLength(2);
  return async () => {
    refresh.resolve(balanceResponse(1800));
    await settleRequests();
  };
}

describe('HomeScreen: saludo y botones en todos los estados', () => {
  afterEach(jest.restoreAllMocks);

  it.each([
    ['cargando', showLoading],
    ['con aviso de error', showFirstLoadError],
    ['con la cifra', showAmount],
  ])(
    'el saludo es un encabezado con el nombre completo sin límite de líneas en todos los estados: %s',
    async (_state, show) => {
      const release = await show();

      const greeting = screen.getByRole('header', { name: `Hola, ${LONG_NAME}` });
      expect(greeting).toHaveTextContent(`Hola, ${LONG_NAME}`);
      expect(greeting.props.numberOfLines).toBeUndefined();

      await release();
    },
  );

  it.each([
    ['al cargar', showLoading],
    ['con aviso', showFirstLoadError],
    ['durante un refresco', showRefreshing],
    ['con la cifra', showAmount],
  ])(
    'los dos botones están habilitados al cargar, con aviso, durante un refresco y con la cifra: %s',
    async (_state, show) => {
      const release = await show();

      for (const name of ['Nueva transferencia', 'Ver transferencias']) {
        const button = screen.getByRole('button', { name });
        expect(button).toBeEnabled();
        expect(button).not.toBeBusy();
      }

      await release();
    },
  );
});
