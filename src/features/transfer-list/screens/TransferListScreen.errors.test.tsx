import { act, fireEvent, screen } from 'expo-router/testing-library';

import { ERROR_MESSAGES } from '@/services/api/errors';
import {
  balanceOk,
  brokenListBodies,
  serverMessageBody,
  sessionUnauthorized,
  transferListEmpty,
  transferListOf,
  transferListWrapped,
} from '@/test/apiFixtures';
import { exposedStrings } from '@/test/a11yTree';
import { mockApiRoutes, reply, type Reply } from '@/test/fetchMock';
import { politeRegionWith, spyOnAnnouncements } from '@/test/homeHelpers';
import { listRequests, renderTransferList, rowNames, settleRequests } from '@/test/transferListHelpers';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

afterEach(jest.restoreAllMocks);

const NETWORK = ERROR_MESSAGES.network;
const UNKNOWN = ERROR_MESSAGES.unknown;

type Failure = { cause: string; list: Reply; message: string };

const firstLoadFailures: Failure[] = [
  { cause: 'sin red', list: 'networkError', message: NETWORK },
  { cause: '15 s sin respuesta', list: 'pending', message: NETWORK },
  { cause: '400', list: reply(400, serverMessageBody), message: UNKNOWN },
  { cause: '403', list: reply(403, serverMessageBody), message: UNKNOWN },
  { cause: '404', list: reply(404, serverMessageBody), message: UNKNOWN },
  { cause: '500', list: reply(500, serverMessageBody), message: UNKNOWN },
  { cause: '503', list: reply(503, serverMessageBody), message: UNKNOWN },
  { cause: '200 que no es JSON', list: { raw: '<html>Error interno</html>', status: 200 }, message: UNKNOWN },
  { cause: 'sin transfers ni lista', list: reply(200, brokenListBodies['sin transfers ni lista']), message: UNKNOWN },
  {
    cause: 'sin nombre del destinatario',
    list: reply(200, brokenListBodies['sin nombre del destinatario']),
    message: UNKNOWN,
  },
  { cause: 'importe como texto', list: reply(200, brokenListBodies['importe como texto']), message: UNKNOWN },
  { cause: 'fecha 2024-02-30', list: reply(200, brokenListBodies['fecha inexistente']), message: UNKNOWN },
  { cause: 'moneda usd', list: reply(200, brokenListBodies['moneda en minúsculas']), message: UNKNOWN },
  { cause: 'moneda vacía', list: reply(200, brokenListBodies['moneda vacía']), message: UNKNOWN },
];

// Monta el listado con la respuesta dada y deja que la primera carga termine.
async function failFirstLoad(list: Reply) {
  await renderTransferList({ list });
  if (list === 'pending') {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(15000);
    });
  }
  await settleRequests();
}

describe('TransferListScreen: error en la primera carga', () => {
  it.each(firstLoadFailures)(
    'si la primera carga falla muestra solo el aviso con su mensaje y Reintentar',
    async ({ list, message }) => {
      const otherMessage = message === NETWORK ? UNKNOWN : NETWORK;

      await failFirstLoad(list);

      expect(screen).toHavePathname('/transferencias');
      expect(screen.getByText(message)).toBeOnTheScreen();
      expect(screen.queryByText(otherMessage)).not.toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled();
      expect(screen.queryByLabelText('Cargando…')).not.toBeOnTheScreen();
      expect(screen.queryByLabelText('Nombre del destinatario')).not.toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: /^Filtro de/ })).not.toBeOnTheScreen();
      expect(screen.queryByText(/^\d+( de \d+)? transferencias?$/)).not.toBeOnTheScreen();
      expect(rowNames()).toEqual([]);
    },
  );
});

// Regiones que se anuncian solas (Android) montadas en este momento.
function politeRegions() {
  return screen.container.queryAll((node) => node.props.accessibilityLiveRegion === 'polite');
}

describe('TransferListScreen: anuncio del error en la primera carga', () => {
  it.each(['ios', 'android'] as const)('el aviso se anuncia y no hay reintento automático', async (os) => {
    const announce = spyOnAnnouncements(os);
    await renderTransferList({ list: 'pending' });
    const regionsBefore = politeRegions();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(15000);
    });

    if (os === 'ios') {
      expect(announce).toHaveBeenCalledTimes(1);
      expect(announce).toHaveBeenCalledWith(NETWORK);
    } else {
      const region = politeRegionWith(NETWORK);
      expect(region).toBeDefined();
      expect(regionsBefore.includes(region as (typeof regionsBefore)[number])).toBe(true);
      expect(announce).not.toHaveBeenCalled();
    }

    await act(async () => {
      await jest.advanceTimersByTimeAsync(60000);
    });

    expect(screen.getByText(NETWORK)).toBeOnTheScreen();
    expect(listRequests()).toHaveLength(1);
  });
});

describe('TransferListScreen: error 400 en la primera carga', () => {
  it('un 400 no muestra el mensaje de datos inválidos', async () => {
    await failFirstLoad(reply(400, serverMessageBody));

    expect(screen.queryByText(ERROR_MESSAGES.badRequest)).not.toBeOnTheScreen();
    expect(screen.getByText(UNKNOWN)).toBeOnTheScreen();
    expect(screen.queryByText(serverMessageBody.message, { exact: false })).not.toBeOnTheScreen();
  });
});

// Cambia la respuesta del listado para la siguiente petición y pulsa Reintentar.
async function retryWith(list: Reply) {
  mockApiRoutes({ balance: reply(200, balanceOk), transferList: list });
  await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
}

// Comprueba que el reintento muestra lo mismo que una primera carga con esa respuesta.
function expectRetryResult(result: string) {
  if (result === 'sin red') {
    expect(screen.getByText(NETWORK)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled();
    expect(screen.queryByLabelText('Nombre del destinatario')).not.toBeOnTheScreen();
  } else {
    expect(screen.queryByText(NETWORK)).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeOnTheScreen();
  }
  if (result === 'éxito') {
    expect(screen.getByText('3 transferencias')).toBeOnTheScreen();
    expect(rowNames()).toEqual(['Ronaldo de Assis Moreira', 'Lionel Andres Messi', 'Federico Valverde']);
  }
  if (result === 'vacío') {
    expect(screen.getByText('Aún no tienes transferencias')).toBeOnTheScreen();
    expect(rowNames()).toEqual([]);
  }
}

describe('TransferListScreen: Reintentar tras fallar la primera carga', () => {
  it('Reintentar quita el aviso, vuelve el skeleton y pide una vez', async () => {
    await failFirstLoad('networkError');

    await retryWith('pending');

    expect(screen.queryByText(NETWORK)).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Cargando…')).toBeBusy();
    expect(listRequests()).toHaveLength(2);
  });

  it.each([
    { result: 'éxito', list: reply(200, transferListWrapped) },
    { result: 'vacío', list: reply(200, transferListEmpty.wrapped) },
    { result: 'sin red', list: 'networkError' as const },
  ])('el resultado del reintento se muestra como la primera carga', async ({ result, list }) => {
    await failFirstLoad('networkError');

    await retryWith(list);
    await settleRequests();

    expectRetryResult(result);
    expect(screen.queryByLabelText('Cargando…')).not.toBeOnTheScreen();
    expect(listRequests()).toHaveLength(2);
  });
});

// Textos sueltos que manda el servidor en el cuerpo: «message», un «transfers» que no es lista o el cuerpo crudo.
function serverTexts(list: Reply): string[] {
  if (typeof list === 'string') return [];
  if ('raw' in list) return [list.raw];
  const body = list.body as Record<string, unknown>;
  return Object.values(body).filter((value): value is string => typeof value === 'string');
}

function showsServerText(shown: string, text: string) {
  return text.trim().length > 1 ? shown.includes(text.trim()) : shown === text;
}

const LIST_NOTICES: string[] = [NETWORK, UNKNOWN];

const anyResponse: { response: string; list: Reply }[] = [
  { response: 'éxito con message del servidor', list: reply(200, transferListWrapped) },
  { response: '[] con message del servidor', list: reply(200, transferListOf([])) },
  { response: '[] sin envoltura', list: reply(200, transferListEmpty.direct) },
  { response: '401', list: reply(401, sessionUnauthorized) },
  { response: '200 con message y transfers como texto', list: reply(200, serverMessageBody) },
  ...firstLoadFailures.map(({ cause, list }) => ({ response: cause, list })),
];

describe('TransferListScreen: texto del servidor', () => {
  it.each(anyResponse)(
    'ninguna respuesta muestra texto del servidor salvo los datos de las transferencias',
    async ({ list }) => {
      const texts = serverTexts(list);

      await failFirstLoad(list);

      const shown = exposedStrings();
      const leaked = shown.filter((item) => texts.some((text) => showsServerText(item, text)));
      const notices = shown.filter((item) => Object.values(ERROR_MESSAGES).includes(item));
      expect(leaked).toEqual([]);
      expect(notices.filter((item) => !LIST_NOTICES.includes(item))).toEqual([]);
    },
  );
});
