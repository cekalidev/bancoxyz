import { FlatList } from 'react-native';
import { fireEvent, screen } from 'expo-router/testing-library';

import { ERROR_MESSAGES } from '@/services/api/errors';
import { transferListOf, transfersOk } from '@/test/apiFixtures';
import { captureAppState, type AppStateCapture } from '@/test/appStateMock';
import { reply } from '@/test/fetchMock';
import { focusedFieldLabels, spyOnReaderFocus, watchFocus } from '@/test/focus';
import { mockReducedMotion } from '@/test/reducedMotion';
import { settleRequests } from '@/test/homeHelpers';
import { rowOf } from '@/test/transferListHelpers';
import { answerListWith, returnFromBackground, settleFailure } from '@/test/transferListRefreshHelpers';
import { renderLoadedList } from '@/test/transferListSheetHelpers';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

afterEach(jest.restoreAllMocks);

const NETWORK = ERROR_MESSAGES.network;

type Node = ReturnType<typeof rowOf>;

// La lista desplazable que contiene las filas.
function scrollingList() {
  let node: Node | null = rowOf('Ronaldo de Assis Moreira');
  while (node && node.type !== 'RCTScrollView') node = node.parent;
  if (!node) throw new Error('Las filas no están dentro de una lista desplazable');
  return node;
}

let appState: AppStateCapture;

beforeEach(() => {
  appState = captureAppState();
});

const motionCases: [string, boolean, boolean][] = [
  ['con movimiento', false, true],
  ['con reducción de movimiento', true, false],
];

describe('TransferListScreen: el aviso de una recarga fallida queda a la vista', () => {
  it.each(motionCases)(
    'si falla una recarga con la lista desplazada, la lista vuelve arriba para que se vea el aviso',
    async (_motion, reduced, animated) => {
      mockReducedMotion(reduced);
      watchFocus();
      const scrollToOffset = jest.spyOn(FlatList.prototype, 'scrollToOffset');
      await renderLoadedList();
      expect(scrollToOffset).not.toHaveBeenCalled();
      await fireEvent.scroll(scrollingList(), { nativeEvent: { contentOffset: { x: 0, y: 400 } } });
      const readerFocus = spyOnReaderFocus();
      const focusCallsBefore = focusedFieldLabels().length;

      answerListWith('networkError');
      await returnFromBackground(appState);
      await settleFailure('networkError');

      expect(screen.getByText(NETWORK)).toBeOnTheScreen();
      expect(scrollToOffset).toHaveBeenCalledTimes(1);
      expect(scrollToOffset).toHaveBeenCalledWith({ offset: 0, animated });
      expect(readerFocus()).toEqual([]);
      expect(focusedFieldLabels()).toHaveLength(focusCallsBefore);

      answerListWith(reply(200, transferListOf(transfersOk)));
      await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
      await settleRequests();

      expect(screen.queryByText(NETWORK)).not.toBeOnTheScreen();
      expect(scrollToOffset).toHaveBeenCalledTimes(1);
    },
  );
});
