import { router } from 'expo-router';
import { act, fireEvent, screen } from 'expo-router/testing-library';

import { dismissPicker } from '@/test/datePickerMock';

import { transferItem, transferListOf, transfersOk } from '@/test/apiFixtures';
import { captureAppState, type AppStateCapture } from '@/test/appStateMock';
import { focusedFieldLabels, watchFocus } from '@/test/focus';
import {
  listRequests,
  openSheet,
  rowNames,
  rowOf,
  settleRequests,
  sheetModal,
  showSheet,
  spyOnReaderFocus,
  typeSearch,
} from '@/test/transferListHelpers';
import { holdNextList, returnFromBackground, visitNewTransferAndBack } from '@/test/transferListRefreshHelpers';
import {
  amountSheetTitle,
  chooseBound,
  dateSheetTitle,
  pressDateBound,
  renderLoadedList,
} from '@/test/transferListSheetHelpers';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

afterEach(jest.restoreAllMocks);

const REAL_NAMES = ['Ronaldo de Assis Moreira', 'Lionel Andres Messi', 'Federico Valverde'];

const otherTransfers = transferListOf([
  transferItem({ name: 'Neymar da Silva Santos', document: '14049940400', date: '2024-09-01' }),
  transferItem({ name: 'Andrés Iniesta', document: '15059950500', date: '2024-05-02' }),
]);

describe('TransferListScreen: recarga al volver a ser visible', () => {
  it('al volver del formulario pide el listado en silencio y sustituye las filas', async () => {
    await renderLoadedList();
    const refresh = holdNextList();

    await visitNewTransferAndBack();

    expect(listRequests()).toHaveLength(2);
    expect(screen.queryByLabelText('Cargando…')).not.toBeOnTheScreen();
    expect(rowNames()).toEqual(REAL_NAMES);

    refresh.resolve(otherTransfers);
    await settleRequests();

    expect(rowNames()).toEqual(['Neymar da Silva Santos', 'Andrés Iniesta']);
    expect(screen.getByText('2 transferencias')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Cargando…')).not.toBeOnTheScreen();
    expect(listRequests()).toHaveLength(2);
  });
});

type Node = ReturnType<typeof rowOf>;

// La lista desplazable que contiene las filas (el Inicio, debajo, tiene la suya).
function scrollingList() {
  let node: Node | null = rowOf('Ronaldo de Assis Moreira');
  while (node && node.type !== 'RCTScrollView') node = node.parent;
  if (!node) throw new Error('Las filas no están dentro de una lista desplazable');
  return node;
}

function isStillMounted(node: Node) {
  return screen.container.queryAll(() => true).includes(node);
}

const realPlusOlder = transferListOf([
  ...transfersOk,
  transferItem({ name: 'Andrés Iniesta', document: '15059950500', date: '2024-05-02' }),
]);

describe('TransferListScreen: la recarga no mueve la lista', () => {
  it('la recarga conserva el foco y la posición de la lista', async () => {
    watchFocus();
    await renderLoadedList();
    await typeSearch('a');
    await fireEvent.scroll(scrollingList(), { nativeEvent: { contentOffset: { x: 0, y: 120 } } });
    const list = scrollingList();
    const search = screen.getByLabelText('Nombre del destinatario');
    const firstRow = rowOf('Ronaldo de Assis Moreira');
    const readerFocus = spyOnReaderFocus();
    const focusCallsBefore = focusedFieldLabels().length;
    const refresh = holdNextList();

    await visitNewTransferAndBack();
    refresh.resolve(realPlusOlder);
    await settleRequests();

    expect(rowNames()).toEqual([...REAL_NAMES, 'Andrés Iniesta']);
    expect(isStillMounted(list)).toBe(true);
    expect(isStillMounted(firstRow)).toBe(true);
    expect(isStillMounted(search)).toBe(true);
    expect(screen.getByLabelText('Nombre del destinatario')).toHaveDisplayValue('a');
    expect(focusedFieldLabels()).toHaveLength(focusCallsBefore);
    expect(readerFocus()).toEqual([]);
  });
});

describe('TransferListScreen: hojas y selector sin peticiones', () => {
  it('abrir o cerrar una hoja o el selector no pide nada', async () => {
    await renderLoadedList();

    await openSheet('Valor');
    await showSheet();
    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar filtro de valor' }));
    await openSheet('Fecha');
    await showSheet();
    await pressDateBound('Desde');
    await dismissPicker();
    await chooseBound('Hasta', { year: 2024, month: 6, day: 30 });
    await fireEvent(sheetModal(), 'requestClose');
    await settleRequests();

    expect(dateSheetTitle()).not.toBeOnTheScreen();
    expect(rowNames()).toEqual(REAL_NAMES);
    expect(listRequests()).toHaveLength(1);
  });
});

let appState: AppStateCapture;

// Hay que capturar el estado de la app antes de montar para poder emitir el segundo plano.
beforeEach(() => {
  appState = captureAppState();
});

describe('TransferListScreen: recarga al volver del segundo plano', () => {
  it('volver del segundo plano pide en silencio', async () => {
    await renderLoadedList();
    const refresh = holdNextList();

    await returnFromBackground(appState);

    expect(listRequests()).toHaveLength(2);
    expect(screen.queryByLabelText('Cargando…')).not.toBeOnTheScreen();
    expect(rowNames()).toEqual(REAL_NAMES);
    refresh.resolve(otherTransfers);
    await settleRequests();
    expect(rowNames()).toEqual(['Neymar da Silva Santos', 'Andrés Iniesta']);
  });

  it('el estado inactivo de iOS no pide nada', async () => {
    await renderLoadedList();

    await appState.emit('inactive');
    await appState.emit('active');
    await settleRequests();

    expect(listRequests()).toHaveLength(1);
    expect(rowNames()).toEqual(REAL_NAMES);
  });

});

describe('TransferListScreen: segundo plano con una hoja o una pantalla encima', () => {
  it('con una hoja abierta también pide', async () => {
    await renderLoadedList();
    await openSheet('Valor');
    await showSheet();
    const refresh = holdNextList();

    await returnFromBackground(appState);

    expect(listRequests()).toHaveLength(2);
    expect(amountSheetTitle()).toBeOnTheScreen();
    refresh.resolve(otherTransfers);
    await settleRequests();
    expect(amountSheetTitle()).toBeOnTheScreen();
  });

  it('con otra pantalla encima no pide hasta volver al listado', async () => {
    await renderLoadedList();
    await act(async () => router.push('/nueva-transferencia'));

    await returnFromBackground(appState);
    await settleRequests();
    expect(listRequests()).toHaveLength(1);

    await act(async () => router.back());
    await settleRequests();
    expect(screen).toHavePathname('/transferencias');
    expect(listRequests()).toHaveLength(2);
  });
});
