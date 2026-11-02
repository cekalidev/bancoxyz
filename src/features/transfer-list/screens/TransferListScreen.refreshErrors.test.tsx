import { fireEvent, screen } from 'expo-router/testing-library';

import { ERROR_MESSAGES } from '@/services/api/errors';
import { treeIndex } from '@/test/a11yTree';
import { transferListOf, transfersOk } from '@/test/apiFixtures';

import { captureAppState, type AppStateCapture } from '@/test/appStateMock';
import { reply } from '@/test/fetchMock';
import { politeRegionWith, settleRequests, spyOnAnnouncements } from '@/test/homeHelpers';
import { iconPathsIn } from '@/test/transferListA11yHelpers';
import { listRequests, renderTransferList, rowNames } from '@/test/transferListHelpers';
import {
  answerListWith,
  holdNextList,
  listFailures,
  REAL_NAMES,
  returnFromBackground,
  settleFailure,
  visitNewTransferAndBack,
} from '@/test/transferListRefreshHelpers';
import { renderFilteredList, renderLoadedList } from '@/test/transferListSheetHelpers';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

afterEach(jest.restoreAllMocks);

const MESSI = 'Lionel Andres Messi';
const RANGE_CHIP = 'Filtro de valor: de 2.000 a 4.000 dólares';

let appState: AppStateCapture;

beforeEach(() => {
  appState = captureAppState();
});

describe('TransferListScreen: error en una recarga con datos', () => {
  it.each(listFailures)(
    'si una recarga falla conserva filas, búsqueda y filtros y muestra el aviso anunciado entre los chips y el contador',
    async ({ list, message }) => {
      await renderFilteredList();
      const announce = spyOnAnnouncements('ios');

      answerListWith(list);
      await returnFromBackground(appState);
      await settleFailure(list);

      expect(screen.queryByText(message)).toBeOnTheScreen();
      expect(rowNames()).toEqual([MESSI]);
      expect(screen.getByLabelText('Nombre del destinatario')).toHaveDisplayValue('mes');
      const chip = screen.getByRole('button', { name: RANGE_CHIP });
      const counter = screen.getByText('1 de 3 transferencias');
      const notice = screen.getByText(message);
      const region = politeRegionWith(message);
      if (!region) throw new Error('El aviso no está en una región que se anuncie');
      expect(iconPathsIn(region).length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled();
      expect(announce).toHaveBeenCalledWith(message);
      expect(treeIndex(notice)).toBeGreaterThan(treeIndex(chip));
      expect(treeIndex(notice)).toBeLessThan(treeIndex(counter));
      expect(screen.queryByLabelText('Cargando…')).not.toBeOnTheScreen();
    },
  );
});

const NETWORK = ERROR_MESSAGES.network;

// Una recarga falla sin red y deja el aviso encima de las filas.
async function failRefresh() {
  answerListWith('networkError');
  await returnFromBackground(appState);
  await settleFailure('networkError');
  expect(screen.getByText(NETWORK)).toBeOnTheScreen();
}

type Trigger = () => Promise<void>;

const refreshTriggers: [string, Trigger][] = [
  ['Reintentar', () => fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }))],
  ['volver a ser visible', visitNewTransferAndBack],
  ['volver del segundo plano', () => returnFromBackground(appState)],
];

describe('TransferListScreen: Reintentar tras fallar una recarga', () => {
  it.each(refreshTriggers)(
    'Reintentar pide sin skeleton y queda ocupado mientras hay una petición',
    async (_trigger, trigger) => {
      await renderLoadedList();
      await failRefresh();
      const pending = holdNextList();

      await trigger();

      expect(listRequests()).toHaveLength(3);
      expect(screen.queryByRole('button', { name: 'Reintentando…' })).toBeOnTheScreen();
      const retry = screen.getByRole('button', { name: 'Reintentando…' });
      expect(retry).toBeDisabled();
      expect(retry).toBeBusy();
      expect(screen.getByText(NETWORK)).toBeOnTheScreen();
      expect(rowNames()).toEqual(REAL_NAMES);
      expect(screen.queryByLabelText('Cargando…')).not.toBeOnTheScreen();
      expect(screen.queryByRole('progressbar')).not.toBeOnTheScreen();

      pending.resolve(transferListOf(transfersOk));
      await settleRequests();
      expect(screen.queryByText(NETWORK)).not.toBeOnTheScreen();
      expect(listRequests()).toHaveLength(3);
    },
  );
});

describe('TransferListScreen: anuncio del aviso de recarga', () => {
  it('un éxito quita el aviso y un nuevo fallo lo vuelve a anunciar', async () => {
    await renderLoadedList();
    const announce = spyOnAnnouncements('ios');
    const noticeAnnouncements = () => announce.mock.calls.filter(([text]) => text === NETWORK).length;

    await failRefresh();
    expect(noticeAnnouncements()).toBe(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    await settleFailure('networkError');
    expect(screen.getByText(NETWORK)).toBeOnTheScreen();
    expect(noticeAnnouncements()).toBe(2);

    answerListWith(reply(200, transferListOf(transfersOk.slice(0, 2))));
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    await settleRequests();
    expect(screen.queryByText(NETWORK)).not.toBeOnTheScreen();
    expect(rowNames()).toEqual(REAL_NAMES.slice(0, 2));

    await failRefresh();
    expect(noticeAnnouncements()).toBe(3);
  });
});

// La primera carga falla sin red: solo se ve su aviso.
async function failFirstLoad() {
  await renderTransferList({ list: 'networkError' });
  await settleRequests();
  expect(screen.getByText(NETWORK)).toBeOnTheScreen();
}

describe('TransferListScreen: recarga con el aviso de la primera carga', () => {
  it.each(refreshTriggers.slice(1))(
    'con el aviso de primera carga, volver a ser visible o del segundo plano pide sin skeleton y con Reintentar ocupado',
    async (_trigger, trigger) => {
      await failFirstLoad();
      const pending = holdNextList();

      await trigger();

      expect(listRequests()).toHaveLength(2);
      expect(screen.queryByRole('button', { name: 'Reintentando…' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Reintentando…' })).toBeDisabled();
      expect(screen.getByText(NETWORK)).toBeOnTheScreen();
      expect(screen.queryByLabelText('Cargando…')).not.toBeOnTheScreen();
      pending.resolve(transferListOf(transfersOk));
      await settleRequests();
      expect(rowNames()).toEqual(REAL_NAMES);
    },
  );

  it('un éxito sustituye el aviso por los datos y un fallo lo vuelve a anunciar', async () => {
    const announce = spyOnAnnouncements('ios');
    const noticeAnnouncements = () => announce.mock.calls.filter(([text]) => text === NETWORK).length;
    await failFirstLoad();
    expect(noticeAnnouncements()).toBe(1);

    await returnFromBackground(appState);
    await settleFailure('networkError');
    expect(screen.getByText(NETWORK)).toBeOnTheScreen();
    expect(noticeAnnouncements()).toBe(2);

    answerListWith(reply(200, transferListOf(transfersOk)));
    await returnFromBackground(appState);
    await settleRequests();
    expect(screen.queryByText(NETWORK)).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeOnTheScreen();
    expect(rowNames()).toEqual(REAL_NAMES);
    expect(screen.getByText('3 transferencias')).toBeOnTheScreen();
  });
});
