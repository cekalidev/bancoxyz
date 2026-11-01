import { act, fireEvent, screen } from 'expo-router/testing-library';

import { transferListOf, transfersOk } from '@/test/apiFixtures';
import { captureAppState, type AppStateCapture } from '@/test/appStateMock';
import { mockFetchPendingEach } from '@/test/fetchMock';
import { listRequests, renderTransferList, rowNames, settleRequests } from '@/test/transferListHelpers';
import { holdNextList, returnFromBackground, visitNewTransferAndBack } from '@/test/transferListRefreshHelpers';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

afterEach(jest.restoreAllMocks);

const REAL_NAMES = ['Ronaldo de Assis Moreira', 'Lionel Andres Messi', 'Federico Valverde'];

let appState: AppStateCapture;

type Trigger = (capture: AppStateCapture) => Promise<void>;

// Cada disparador llega varias veces mientras la petición del listado sigue en curso.
const repeatedTriggers: [string, Trigger][] = [
  [
    'foco',
    async () => {
      await visitNewTransferAndBack();
      await visitNewTransferAndBack();
    },
  ],
  [
    'segundo plano',
    async (capture) => {
      await returnFromBackground(capture);
      await returnFromBackground(capture);
    },
  ],
  [
    'Reintentar ×3',
    async () => {
      // Las tres pulsaciones llegan en el mismo tick, antes de que el botón cambie.
      const retry = screen.getByRole('button', { name: 'Reintentar' });
      await act(async () => {
        await Promise.all([fireEvent.press(retry), fireEvent.press(retry), fireEvent.press(retry)]);
      });
    },
  ],
];

describe('TransferListScreen: una sola petición del listado a la vez', () => {
  beforeEach(() => {
    appState = captureAppState();
  });

  it.each(repeatedTriggers)('con una petición en curso otro disparador se ignora', async (_trigger, trigger) => {
    await renderTransferList({ list: 'networkError' });
    await settleRequests();
    const pending = holdNextList();

    await trigger(appState);

    expect(listRequests()).toHaveLength(2);
    pending.resolve(transferListOf(transfersOk));
    await settleRequests();
    expect(rowNames()).toEqual(REAL_NAMES);
    expect(listRequests()).toHaveLength(2);
  });

  it('al entrar se envía una sola petición aunque lleguen foco y primer plano a la vez', async () => {
    await renderTransferList({ list: 'pending' });
    mockFetchPendingEach();

    await returnFromBackground(appState);

    expect(screen).toHavePathname('/transferencias');
    expect(listRequests()).toHaveLength(1);
  });
});
