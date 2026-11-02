import { userEvent, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { act, screen } from 'expo-router/testing-library';

import { ERROR_MESSAGES } from '@/services/api/errors';
import { treeIndex } from '@/test/a11yTree';
import { transferListEmpty } from '@/test/apiFixtures';
import { reply, type Reply } from '@/test/fetchMock';
import { colors } from '@/theme';
import {
  listRequests,
  renderTransferList,
  rowNames,
  rowOf,
  typeSearch,
} from '@/test/transferListHelpers';
import { flushResponses } from '@/test/transferListRefreshHelpers';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

afterEach(jest.restoreAllMocks);

// Líneas de 1 dp que separan el contador y las filas del listado.
function separatorLines() {
  return screen.container.queryAll((node) => {
    const style = StyleSheet.flatten(node.props.style);
    return style?.height === 1 && style.backgroundColor === colors.borderSubtle;
  });
}

describe('TransferListScreen: carga del listado', () => {
  it('al entrar pide el listado una vez y muestra el skeleton sin indicador giratorio ni Disponible pronto', async () => {
    await renderTransferList({ list: 'pending' });

    expect(screen).toHavePathname('/transferencias');
    expect(screen.getByLabelText('Cargando…')).toBeBusy();
    expect(screen.queryByRole('progressbar')).not.toBeOnTheScreen();
    expect(screen.queryByText('Disponible pronto')).not.toBeOnTheScreen();
    expect(listRequests()).toHaveLength(1);
  });

  it('con las tres reales muestra la búsqueda vacía, los chips sin aplicar, 3 transferencias y una fila por cada una', async () => {
    await renderTransferList();

    expect(await screen.findByText('3 transferencias')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Cargando…')).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Nombre del destinatario')).toHaveDisplayValue('');
    expect(screen.getByRole('button', { name: 'Filtro de valor: sin aplicar' })).toHaveTextContent(/Valor/);
    expect(screen.getByRole('button', { name: 'Filtro de fecha: sin aplicar' })).toHaveTextContent(/Fecha/);
    expect(rowNames()).toEqual(['Ronaldo de Assis Moreira', 'Lionel Andres Messi', 'Federico Valverde']);
    expect(listRequests()).toHaveLength(1);
    const lines = separatorLines();
    expect(lines).toHaveLength(3);
    expect(treeIndex(lines[0])).toBeGreaterThan(treeIndex(screen.getByText('3 transferencias')));
    expect(treeIndex(lines[0])).toBeLessThan(treeIndex(screen.getAllByLabelText(/^Transferencia a /)[0]));
  });
});

describe('TransferListScreen: tope de la espera', () => {
  it('la espera termina a los 15 s con el aviso de conexión', async () => {
    await renderTransferList({ list: 'pending' });

    await act(async () => {
      await jest.advanceTimersByTimeAsync(14999);
    });

    expect(screen.getByLabelText('Cargando…')).toBeBusy();
    expect(screen.queryByText(ERROR_MESSAGES.network)).not.toBeOnTheScreen();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1);
    });

    expect(screen.getByText(ERROR_MESSAGES.network)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled();
    expect(screen.queryByLabelText('Cargando…')).not.toBeOnTheScreen();
    expect(listRequests()).toHaveLength(1);
  });
});

// Trazos del icono de lista: tres líneas y tres puntos.
const LIST_ICON_PATHS = ['M9 6H20', 'M9 12H20', 'M9 18H20', 'M4 6V6.5', 'M4 12V12.5', 'M4 18V18.5'];

describe('TransferListScreen: lista vacía', () => {
  it.each([
    { shape: '[]', body: transferListEmpty.direct },
    { shape: '{ transfers: [] }', body: transferListEmpty.wrapped },
  ])('una lista vacía muestra el vacío sin búsqueda, chips ni contador', async ({ body }) => {
    await renderTransferList({ list: reply(200, body) });

    const title = await screen.findByRole('header', { name: 'Aún no tienes transferencias' });
    const empty = title.parent ?? title;
    const paths = empty.queryAll((node) => typeof node.props.d === 'string').map((node) => node.props.d);
    expect(paths).toEqual(LIST_ICON_PATHS);
    expect(within(empty).getByText('Cuando hagas una, aparecerá aquí.')).toBeOnTheScreen();
    const action = within(empty).getByRole('button', { name: 'Nueva transferencia' });
    expect(within(action).getByTestId('button-gradient')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Cargando…')).not.toBeOnTheScreen();
    expect(screen.queryByLabelText('Nombre del destinatario')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Filtro de/ })).not.toBeOnTheScreen();
    expect(screen.queryByText(/^\d+( de \d+)? transferencias?$/)).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeOnTheScreen();
    expect(rowNames()).toEqual([]);
    expect(listRequests()).toHaveLength(1);
  });
});

describe('TransferListScreen: toque en una fila', () => {
  it('tocar una fila no abre ninguna pantalla', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const names = ['Ronaldo de Assis Moreira', 'Lionel Andres Messi', 'Federico Valverde'];
    await renderTransferList();

    expect(await screen.findByText('3 transferencias')).toBeOnTheScreen();
    expect(rowNames()).toEqual(names);

    for (const name of names) {
      await user.press(rowOf(name));

      expect(screen).toHavePathname('/transferencias');
      expect(screen.getAllByText(name)).toHaveLength(1);
    }

    expect(screen.getByText('3 transferencias')).toBeOnTheScreen();
    expect(rowNames()).toEqual(names);
    expect(listRequests()).toHaveLength(1);
  });
});

type ListState = { state: string; list?: Reply; search?: string; shown: () => unknown };

const listStates: ListState[] = [
  { state: 'skeleton', list: 'pending', shown: () => screen.getByLabelText('Cargando…') },
  { state: 'filas', shown: () => screen.getByText('3 transferencias') },
  {
    state: 'vacío 1g',
    list: reply(200, transferListEmpty.direct),
    shown: () => screen.getByRole('header', { name: 'Aún no tienes transferencias' }),
  },
  { state: 'vacío por filtros 1h', search: 'zzz', shown: () => screen.getByText('Sin resultados para estos filtros') },
  { state: 'aviso', list: 'networkError', shown: () => screen.getByText(ERROR_MESSAGES.network) },
];

// Nodos con recarga al deslizar o con un indicador giratorio.
function pullOrSpinnerNodes() {
  return screen.container.queryAll(
    (node) =>
      node.props.refreshControl !== undefined ||
      typeof node.props.onRefresh === 'function' ||
      node.type === 'ActivityIndicator',
  );
}

describe('TransferListScreen: sin recarga manual', () => {
  it.each(listStates)(
    'el listado no tiene botón de actualizar, recarga al deslizar ni indicador giratorio',
    async ({ list, search, shown }) => {
      await renderTransferList({ list });
      await flushResponses();
      if (search) await typeSearch(search);

      expect(shown()).toBeOnTheScreen();
      expect(screen.queryAllByRole('button', { name: /actualizar|recargar|refrescar/i })).toHaveLength(0);
      expect(screen.queryByRole('progressbar')).not.toBeOnTheScreen();
      expect(pullOrSpinnerNodes()).toHaveLength(0);
    },
  );
});
