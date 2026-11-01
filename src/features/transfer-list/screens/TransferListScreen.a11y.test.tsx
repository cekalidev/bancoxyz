import { screen, within } from 'expo-router/testing-library';

import {
  NO_RESULTS_TEXT,
  NO_RESULTS_TITLE,
  NO_TRANSFERS_TEXT,
  NO_TRANSFERS_TITLE,
} from '@/features/transfer-list/listText';
import {
  blockOf,
  failListRefresh,
  iconPathsIn,
  listReadingOrder,
  NETWORK_MESSAGE,
  RANGE_ERROR,
  renderFirstLoadError,
  renderNoTransfers,
  type Scenario,
} from '@/test/transferListA11yHelpers';
import { applySheet, rowOf, typeSearch } from '@/test/transferListHelpers';
import { fillAmountSheet, renderLoadedList } from '@/test/transferListSheetHelpers';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

afterEach(jest.restoreAllMocks);

const SEARCH_LABEL = 'Nombre del destinatario';

const controlScenarios: (Scenario & { buttons: string[]; search: boolean })[] = [
  {
    state: 'con búsqueda',
    arrange: async () => {
      await renderLoadedList();
      await typeSearch('mes');
    },
    buttons: ['Volver', 'Borrar búsqueda', 'Filtro de valor: sin aplicar', 'Filtro de fecha: sin aplicar', 'Limpiar filtros'],
    search: true,
  },
  { state: 'error de la primera carga', arrange: renderFirstLoadError, buttons: ['Volver', 'Reintentar'], search: false },
  { state: 'sin transferencias', arrange: renderNoTransfers, buttons: ['Volver', 'Nueva transferencia'], search: false },
];

describe('TransferListScreen: roles y etiquetas', () => {
  it.each(controlScenarios)(
    'los controles del listado tienen rol y etiqueta en español',
    async ({ arrange, buttons, search }) => {
      await arrange();

      for (const name of buttons) expect(screen.getByRole('button', { name })).toBeOnTheScreen();
      for (const chip of screen.queryAllByRole('button', { name: /^Filtro de/ })) {
        expect(chip).toHaveProp('accessibilityHint', 'Abre el filtro');
      }
      if (search) expect(screen.getByLabelText(SEARCH_LABEL).type).toBe('TextInput');
      else expect(screen.queryByLabelText(SEARCH_LABEL)).not.toBeOnTheScreen();
    },
  );
});

const iconScenarios: (Scenario & { text: string })[] = [
  { state: 'error de la primera carga', arrange: renderFirstLoadError, text: NETWORK_MESSAGE },
  {
    state: 'error de una recarga',
    arrange: async () => {
      await renderLoadedList();
      await failListRefresh();
    },
    text: NETWORK_MESSAGE,
  },
  {
    state: 'error de rango en la hoja de valor',
    arrange: async () => {
      await renderLoadedList();
      await fillAmountSheet('5.000,00', '1.000,00');
      await applySheet();
    },
    text: RANGE_ERROR,
  },
  { state: 'sin transferencias', arrange: renderNoTransfers, text: NO_TRANSFERS_TITLE },
  {
    state: 'sin resultados',
    arrange: async () => {
      await renderLoadedList();
      await typeSearch('xyz');
    },
    text: NO_RESULTS_TITLE,
  },
];

describe('TransferListScreen: iconos de avisos y vacíos', () => {
  it.each(iconScenarios)('avisos, errores y vacíos llevan icono', async ({ arrange, text }) => {
    await arrange();

    expect(iconPathsIn(blockOf(text)).length).toBeGreaterThan(0);
  });
});

const LIST_HEADER = ['Volver', 'Transferencias', 'Nombre del destinatario'];
const CHIPS = ['Filtro de valor: sin aplicar', 'Filtro de fecha: sin aplicar'];
const RONALDO_ROW = 'Transferencia a Ronaldo de Assis Moreira, CPF 120.199.101-77, 1.000,00 dólares, 25 de agosto de 2024';
const MESSI_ROW = 'Transferencia a Lionel Andres Messi, CPF 110.299.202-88, 3.500,00 dólares, 12 de junio de 2024';
const VALVERDE_ROW = 'Transferencia a Federico Valverde, CPF 130.399.303-99, 2.000,00 dólares, 12 de junio de 2024';

const readingScenarios: (Scenario & { order: string[] })[] = [
  {
    state: 'sin opcionales',
    arrange: () => renderLoadedList(),
    order: [...LIST_HEADER, ...CHIPS, '3 transferencias', RONALDO_ROW, MESSI_ROW, VALVERDE_ROW],
  },
  {
    state: 'con búsqueda, aviso y Limpiar filtros',
    arrange: async () => {
      await renderLoadedList();
      await typeSearch('mes');
      await failListRefresh();
    },
    order: [
      ...LIST_HEADER,
      'Borrar búsqueda',
      ...CHIPS,
      NETWORK_MESSAGE,
      'Reintentar',
      '1 de 3 transferencias',
      'Limpiar filtros',
      MESSI_ROW,
    ],
  },
  {
    state: 'vacío por filtros',
    arrange: async () => {
      await renderLoadedList();
      await typeSearch('xyz');
    },
    order: [...LIST_HEADER, 'Borrar búsqueda', ...CHIPS, '0 de 3 transferencias', NO_RESULTS_TITLE, NO_RESULTS_TEXT, 'Limpiar filtros'],
  },
  {
    state: 'sin transferencias',
    arrange: renderNoTransfers,
    order: ['Volver', 'Transferencias', NO_TRANSFERS_TITLE, NO_TRANSFERS_TEXT, 'Nueva transferencia'],
  },
];

describe('TransferListScreen: orden de lectura del listado', () => {
  it.each(readingScenarios)(
    'el orden de lectura del listado es Volver, título, búsqueda, chips, aviso, contador, Limpiar filtros y filas',
    async ({ arrange, order }) => {
      await arrange();

      expect(listReadingOrder()).toEqual(order);
    },
  );
});

const RONALDO = 'Ronaldo de Assis Moreira';

// La lista vertical desplazable: la que contiene las filas (los chips desplazan en horizontal).
function listScrollView() {
  const scrolls = screen.container.queryAll((node) => node.type === 'RCTScrollView' && node.props.horizontal !== true);
  const list = scrolls.find((node) => within(node).queryByLabelText(new RegExp(`^Transferencia a ${RONALDO}, `)));
  if (!list) throw new Error('No hay lista desplazable con las filas');
  return list;
}

describe('TransferListScreen: letra grande', () => {
  it('nombre e importe no limitan sus líneas y el importe puede bajar bajo el nombre', async () => {
    await renderLoadedList();
    const row = rowOf(RONALDO);
    const name = within(row).getByText(RONALDO);
    const amount = within(row).getByText(/1\.000,00/);

    expect(name.props.numberOfLines).toBeUndefined();
    expect(amount.props.numberOfLines).toBeUndefined();
    expect(name.parent).toHaveStyle({ flexDirection: 'row', flexWrap: 'wrap' });
    expect(amount).toHaveStyle({ flexShrink: 0 });
  });

  it('la búsqueda y los chips quedan fuera de la lista desplazable', async () => {
    await renderLoadedList();
    const list = listScrollView();

    expect(screen.getByLabelText('Nombre del destinatario')).toBeOnTheScreen();
    expect(within(list).queryByLabelText('Nombre del destinatario')).not.toBeOnTheScreen();
    expect(within(list).queryAllByRole('button', { name: /^Filtro de/ })).toHaveLength(0);
    expect(within(list).getByText('3 transferencias')).toBeOnTheScreen();
  });
});
