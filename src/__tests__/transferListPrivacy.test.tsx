import { fireEvent, screen } from 'expo-router/testing-library';

import { exposedStrings } from '@/test/a11yTree';
import { sessionUnauthorized, transferListWrapped, transfersOk } from '@/test/apiFixtures';
import { captureAppState, type AppStateCapture } from '@/test/appStateMock';
import { reply } from '@/test/fetchMock';
import { secureStoreModule, storedValue } from '@/test/secureStoreMock';
import { prepareAppTest, relaunchApp, renderApp, seedSession } from '@/test/sessionHelpers';
import {
  LIST_NOW,
  listRequests,
  listSession,
  renderTransferList,
  rowNames,
  settleRequests,
  typeSearch,
} from '@/test/transferListHelpers';
import { answerListWith, holdNextList, returnFromBackground } from '@/test/transferListRefreshHelpers';
import { applyAmountRange } from '@/test/transferListSheetHelpers';
import { logOut, signIn, waitForHome } from '@/test/transferSessionHelpers';

jest.mock('expo-font', () => ({ useFonts: jest.fn(() => [true, null]) }));
jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

const TOKEN = listSession.token;
const DOCUMENTS = transfersOk.map(({ payeer }) => payeer.document);
const AMOUNTS = transfersOk.flatMap(({ value }) => [String(value), (value / 1000).toFixed(3)]);
const NAMES = transfersOk.map(({ payeer }) => payeer.name);
const SEARCH = 'Nombre del destinatario';
const FILTERED_COUNTER = '1 de 3 transferencias';
const CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'debug'] as const;

// Espía todos los registros de la consola y devuelve el texto de cada llamada.
function spyOnLogs() {
  const spies = CONSOLE_METHODS.map((method) => jest.spyOn(console, method));
  return () => spies.flatMap((spy) => spy.mock.calls.map((args) => args.map((arg) => JSON.stringify(arg)).join(' ')));
}

const pressButton = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

// Desde el Inicio entra al listado y deja aplicados «mes» y el rango 2.000,00–4.000,00.
async function filterList() {
  await pressButton('Ver transferencias');
  await settleRequests();
  await typeSearch('mes');
  await applyAmountRange('2.000,00', '4.000,00');
  expect(screen.getByText(FILTERED_COUNTER)).toBeOnTheScreen();
}

async function openFilteredList() {
  await renderApp('/');
  await waitForHome(listSession);
  await filterList();
}

function expectFreshList() {
  expect(screen.getByLabelText(SEARCH)).toHaveDisplayValue('');
  expect(screen.getByRole('button', { name: 'Filtro de valor: sin aplicar' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Filtro de fecha: sin aplicar' })).toBeOnTheScreen();
  expect(rowNames()).toEqual(NAMES);
}

// Claves con valor en el almacenamiento seguro simulado y todo lo que se escribió en él.
function storedKeys() {
  const written = secureStoreModule.setItemAsync.mock.calls.map(([key]) => key);
  return [...new Set(written)].filter((key) => storedValue(key) !== null);
}
const secureStoreWrites = () => secureStoreModule.setItemAsync.mock.calls.flat();

let appState: AppStateCapture;

// Formas de cerrar la sesión desde el listado filtrado: con «Salir» en el Inicio o con un 401 del listado.
const sessionEnds: [string, () => Promise<void>][] = [
  [
    'Salir',
    async () => {
      await pressButton('Volver');
      await settleRequests();
      await logOut();
    },
  ],
  [
    '401',
    async () => {
      answerListWith(reply(401, sessionUnauthorized));
      await returnFromBackground(appState);
      await settleRequests();
    },
  ],
];

beforeEach(() => {
  appState = captureAppState();
  jest.useFakeTimers().setSystemTime(LIST_NOW);
});
afterEach(jest.restoreAllMocks);

describe('privacidad del listado', () => {
  it('el token va solo en la cabecera Authorization del listado', async () => {
    await renderTransferList();
    await settleRequests();

    expect(listRequests()).toHaveLength(1);
    const [url, init] = listRequests()[0];
    const headers = [...new Headers(init?.headers).entries()];
    expect(headers.filter(([, value]) => value.includes(TOKEN))).toEqual([['authorization', `Bearer ${TOKEN}`]]);
    expect(String(url)).not.toContain(TOKEN);
    expect(String(init?.body ?? '')).not.toContain(TOKEN);
  });

  it('el token, los importes y los documentos no aparecen en textos, etiquetas ni registros', async () => {
    const logs = spyOnLogs();

    await renderTransferList();
    await settleRequests();
    await typeSearch('mes');

    expect(exposedStrings().filter((text) => text.includes(TOKEN))).toEqual([]);
    const leaked = logs().filter((entry) => [TOKEN, ...DOCUMENTS, ...AMOUNTS].some((data) => entry.includes(data)));
    expect(leaked).toEqual([]);
  });
});

beforeEach(prepareAppTest);

describe('el listado solo vive en memoria', () => {

  it('el almacenamiento solo guarda la sesión, nunca el listado, la búsqueda ni los filtros', async () => {
    await renderApp('/login');
    await signIn(listSession);
    answerListWith(reply(200, transferListWrapped));

    await filterList();

    expect(storedKeys()).toEqual(['bancoxyz.session']);
    const fragments = [...NAMES, ...DOCUMENTS, 'mes', '2000', '4000', 'transfers'];
    secureStoreWrites().forEach((entry) => fragments.forEach((fragment) => expect(entry).not.toContain(fragment)));
  });

  it('al reabrir la app el listado se vuelve a pedir y aparece sin filtros', async () => {
    seedSession(listSession);
    await openFilteredList();

    await relaunchApp('/');
    await waitForHome(listSession);
    await pressButton('Ver transferencias');
    await settleRequests();

    expect(listRequests()).toHaveLength(2);
    expectFreshList();
  });
});

describe('el listado de una sesión nueva', () => {
  it.each(sessionEnds)(
    'tras Salir o un 401 y un nuevo login no se ven datos ni filtros anteriores antes de su respuesta',
    async (_end, endSession) => {
      seedSession(listSession);
      await openFilteredList();
      await endSession();
      expect(screen).toHavePathname('/login');
      await signIn(listSession);
      const held = holdNextList();

      await pressButton('Ver transferencias');

      expect(screen.getByLabelText('Cargando…')).toBeOnTheScreen();
      expect(rowNames()).toEqual([]);
      expect(screen.queryByLabelText(SEARCH)).toBeNull();
      expect(screen.queryByText(FILTERED_COUNTER)).toBeNull();
      held.resolve(transferListWrapped);
      await settleRequests();
      expectFreshList();
    },
  );
});
