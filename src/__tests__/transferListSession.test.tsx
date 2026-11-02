import { router } from 'expo-router';
import { act, screen } from 'expo-router/testing-library';

import * as sessionActions from '@/features/auth/sessionActions';
import { ERROR_MESSAGES } from '@/services/api/errors';
import { balanceOk, serverMessageBody, sessionUnauthorized, transferListWrapped } from '@/test/apiFixtures';
import { captureAppState } from '@/test/appStateMock';
import { mockApiRoutes, reply, type Reply } from '@/test/fetchMock';
import { settleRequests, spyOnAnnouncements } from '@/test/homeHelpers';
import { prepareSessionTest, renderApp, seedSession } from '@/test/sessionHelpers';
import {
  LIST_NOW,
  listSession,
  openSheet,
  renderTransferList,
  rowNames,
  sheetModal,
  showSheet,
} from '@/test/transferListHelpers';
import { answerListWith, returnFromBackground, visitNewTransferAndBack } from '@/test/transferListRefreshHelpers';
import { amountSheetTitle } from '@/test/transferListSheetHelpers';
import { pressButton } from '@/test/transferSessionHelpers';

jest.mock('expo-font', () => ({ useFonts: jest.fn(() => [true, null]) }));
jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

const EXPIRED = ERROR_MESSAGES.unauthorized;
const EXPIRED_REPLY = reply(401, sessionUnauthorized);
const LIST_NOTICES = [ERROR_MESSAGES.network, ERROR_MESSAGES.unknown];
const GREETING = `Hola, ${listSession.user.name}`;
const COUNTER = '3 transferencias';
const ALL_NAMES = ['Ronaldo de Assis Moreira', 'Lionel Andres Messi', 'Federico Valverde'];

// Abre la app con la sesión guardada y entra al listado con la respuesta indicada.
async function enterList(list: Reply) {
  mockApiRoutes({ balance: reply(200, balanceOk), transferList: list });
  await renderApp('/');
  expect(await screen.findByRole('header', { name: GREETING })).toBeOnTheScreen();
  await settleRequests();
  await pressButton('Ver transferencias');
  await settleRequests();
}

// Cada momento lleva el listado hasta justo antes de su petición y devuelve cómo hacer que responda 401.
const expiryMoments: [string, () => Promise<() => Promise<void>>][] = [
  ['primera carga', async () => () => enterList(EXPIRED_REPLY)],
  [
    'Reintentar',
    async () => {
      await enterList(reply(500, serverMessageBody));
      expect(screen.getByText(ERROR_MESSAGES.unknown)).toBeOnTheScreen();
      return async () => {
        answerListWith(EXPIRED_REPLY);
        await pressButton('Reintentar');
      };
    },
  ],
  [
    'recarga silenciosa',
    async () => {
      const appState = captureAppState();
      await enterList(reply(200, transferListWrapped));
      expect(screen.getByText(COUNTER)).toBeOnTheScreen();
      return async () => {
        answerListWith(EXPIRED_REPLY);
        await returnFromBackground(appState);
      };
    },
  ],
];

function expectNoListNotice() {
  LIST_NOTICES.forEach((notice) => expect(screen.queryByText(notice)).toBeNull());
}

beforeEach(() => {
  prepareSessionTest();
  seedSession(listSession);
  jest.useFakeTimers().setSystemTime(LIST_NOW);
});
afterEach(jest.restoreAllMocks);

describe('sesión caducada en el listado', () => {
  it.each(expiryMoments)(
    'un 401 del listado lleva al login con el aviso de sesión caducada sin aviso propio',
    async (_moment, reach) => {
      const announce = spyOnAnnouncements('ios');
      const answerWith401 = await reach();
      announce.mockClear();

      await answerWith401();
      await settleRequests();

      expect(await screen.findByText(EXPIRED)).toBeOnTheScreen();
      expect(screen).toHavePathname('/login');
      expect(screen.getAllByText(EXPIRED)).toHaveLength(1);
      expectNoListNotice();
      const announced = announce.mock.calls.map(([message]) => message);
      LIST_NOTICES.forEach((notice) => expect(announced).not.toContain(notice));
    },
  );

});

describe('el listado tras la sesión caducada', () => {
  it('atrás no vuelve al listado', async () => {
    await enterList(EXPIRED_REPLY);
    expect(await screen.findByText(EXPIRED)).toBeOnTheScreen();

    await act(async () => router.back());

    expect(screen).toHavePathname('/login');
    expect(router.canGoBack()).toBe(false);
    expect(screen.queryByRole('header', { name: 'Transferencias' })).toBeNull();
    expect(rowNames()).toEqual([]);
  });

  it('una hoja abierta desaparece con el listado', async () => {
    const appState = captureAppState();
    await enterList(reply(200, transferListWrapped));
    await openSheet('Valor');
    await showSheet();
    expect(amountSheetTitle()).toBeOnTheScreen();

    answerListWith(EXPIRED_REPLY);
    await returnFromBackground(appState);
    await settleRequests();

    expect(await screen.findByText(EXPIRED)).toBeOnTheScreen();
    expect(screen).toHavePathname('/login');
    expect(sheetModal()).toBeUndefined();
    expect(amountSheetTitle()).toBeNull();
  });
});

// En la app el 401 cierra la sesión y desmonta el listado; aquí se sustituye ese cierre para seguir viéndolo.
// Se espía antes de montar porque `renderTransferList` conecta el cierre a la API.
function keepListMounted() {
  return jest.spyOn(sessionActions, 'expireSession').mockImplementation(() => undefined);
}

type UnchangedCase = { reach: () => Promise<() => Promise<void>>; expectUnchanged: () => void };

const unchangedCases: [string, UnchangedCase][] = [
  [
    'skeleton',
    {
      reach: async () => async () => {
        await renderTransferList({ list: EXPIRED_REPLY });
      },
      expectUnchanged: () => {
        expect(screen.getByLabelText('Cargando…')).toBeOnTheScreen();
        expect(rowNames()).toEqual([]);
        expectNoListNotice();
      },
    },
  ],
  [
    'filas',
    {
      reach: async () => {
        await renderTransferList();
        await settleRequests();
        expect(screen.getByText(COUNTER)).toBeOnTheScreen();
        return async () => {
          answerListWith(EXPIRED_REPLY);
          await visitNewTransferAndBack();
        };
      },
      expectUnchanged: () => {
        expect(rowNames()).toEqual(ALL_NAMES);
        expect(screen.getByText(COUNTER)).toBeOnTheScreen();
        expectNoListNotice();
      },
    },
  ],
  [
    'aviso previo',
    {
      reach: async () => {
        await renderTransferList();
        await settleRequests();
        answerListWith(reply(500, serverMessageBody));
        await visitNewTransferAndBack();
        await settleRequests();
        expect(screen.getByText(ERROR_MESSAGES.unknown)).toBeOnTheScreen();
        return async () => {
          answerListWith(EXPIRED_REPLY);
          await pressButton('Reintentar');
        };
      },
      expectUnchanged: () => {
        expect(screen.getAllByText(ERROR_MESSAGES.unknown)).toHaveLength(1);
        expect(rowNames()).toEqual(ALL_NAMES);
        expect(screen.queryByText(ERROR_MESSAGES.network)).toBeNull();
      },
    },
  ],
];

describe('el listado mientras se cierra la sesión', () => {
  it.each(unchangedCases)('mientras tanto no cambia lo que se veía', async (_state, { reach, expectUnchanged }) => {
    const expireSession = keepListMounted();
    const announce = spyOnAnnouncements('ios');
    const answerWith401 = await reach();
    announce.mockClear();

    await answerWith401();
    await settleRequests();

    expect(expireSession).toHaveBeenCalledTimes(1);
    expect(screen).toHavePathname('/transferencias');
    expectUnchanged();
    expect(screen.queryByText(EXPIRED)).toBeNull();
    expect(announce).not.toHaveBeenCalled();
  });
});
