import { fireEvent, screen } from 'expo-router/testing-library';

import { ERROR_MESSAGES } from '@/services/api/errors';
import { treeIndex } from '@/test/a11yTree';
import { transferListEmpty, transferListOf, transfersOk } from '@/test/apiFixtures';
import { captureAppState, type AppStateCapture } from '@/test/appStateMock';
import { reply } from '@/test/fetchMock';
import { settleRequests, spyOnAnnouncements } from '@/test/homeHelpers';
import { listRequests, rowNames, typeSearch } from '@/test/transferListHelpers';
import {
  answerListWith,
  holdNextList,
  returnFromBackground,
  settleFailure,
} from '@/test/transferListRefreshHelpers';
import { applyAmountRange, renderLoadedList } from '@/test/transferListSheetHelpers';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

afterEach(jest.restoreAllMocks);

const NETWORK = ERROR_MESSAGES.network;
const EMPTY_TITLE = 'Aún no tienes transferencias';

let appState: AppStateCapture;

beforeEach(() => {
  appState = captureAppState();
});

// Con «mes» y 2.000,00–4.000,00 aplicados, una recarga trae `[]` y después otra falla sin red.
async function failRefreshOnEmpty() {
  await renderLoadedList();
  await typeSearch('mes');
  await applyAmountRange('2.000,00', '4.000,00');
  answerListWith(reply(200, transferListEmpty.direct));
  await returnFromBackground(appState);
  await settleRequests();
  expect(screen.getByRole('header', { name: EMPTY_TITLE })).toBeOnTheScreen();
  answerListWith('networkError');
  await returnFromBackground(appState);
  await settleFailure('networkError');
}

describe('TransferListScreen: error de recarga en el vacío', () => {
  it('en el vacío, si una recarga falla se ve el aviso encima del icono y se anuncia', async () => {
    const announce = spyOnAnnouncements('ios');

    await failRefreshOnEmpty();

    expect(screen.queryByText(NETWORK)).toBeOnTheScreen();
    const title = screen.getByRole('header', { name: EMPTY_TITLE });
    const [iconPath] = (title.parent ?? title).queryAll((node) => typeof node.props.d === 'string');
    expect(treeIndex(screen.getByText(NETWORK))).toBeLessThan(treeIndex(iconPath));
    expect(screen.getByText('Cuando hagas una, aparecerá aquí.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled();
    expect(announce).toHaveBeenCalledWith(NETWORK);
    expect(screen.queryByLabelText('Nombre del destinatario')).not.toBeOnTheScreen();
  });

});

describe('TransferListScreen: Reintentar en el vacío', () => {
  it('su Reintentar pide sin skeleton y queda ocupado', async () => {
    await failRefreshOnEmpty();
    expect(screen.queryByText(NETWORK)).toBeOnTheScreen();
    const pending = holdNextList();

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(listRequests()).toHaveLength(4);
    expect(screen.queryByRole('button', { name: 'Reintentando…' })).toBeOnTheScreen();
    const retry = screen.getByRole('button', { name: 'Reintentando…' });
    expect(retry).toBeDisabled();
    expect(retry).toBeBusy();
    expect(screen.getByText(NETWORK)).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: EMPTY_TITLE })).toBeOnTheScreen();
    expect(screen.queryByLabelText('Cargando…')).not.toBeOnTheScreen();
    expect(screen.queryByRole('progressbar')).not.toBeOnTheScreen();
    pending.resolve(transferListEmpty.wrapped);
    await settleRequests();
    expect(listRequests()).toHaveLength(4);
  });

});

describe('TransferListScreen: éxito tras el error en el vacío', () => {
  it.each([
    { received: '[]', body: transferListEmpty.direct, names: [], counter: null },
    {
      received: 'datos con filtros conservados',
      body: transferListOf(transfersOk),
      names: ['Lionel Andres Messi'],
      counter: '1 de 3 transferencias',
    },
  ])('un éxito quita el aviso y muestra lo recibido', async ({ body, names, counter }) => {
    await failRefreshOnEmpty();
    expect(screen.queryByText(NETWORK)).toBeOnTheScreen();

    answerListWith(reply(200, body));
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    await settleRequests();

    expect(screen.queryByText(NETWORK)).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeOnTheScreen();
    expect(rowNames()).toEqual(names);
    if (counter) {
      expect(screen.getByText(counter)).toBeOnTheScreen();
      expect(screen.getByLabelText('Nombre del destinatario')).toHaveDisplayValue('mes');
    } else {
      expect(screen.getByRole('header', { name: EMPTY_TITLE })).toBeOnTheScreen();
    }
  });
});
