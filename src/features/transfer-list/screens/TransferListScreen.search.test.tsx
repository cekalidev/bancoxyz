import { userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { act, fireEvent, screen } from 'expo-router/testing-library';

import { focusedFieldLabels, spyOnFocusEvents, watchFocus } from '@/test/focus';
import { colors } from '@/theme';
import {
  applySheet,
  listRequests,
  openSheet,
  renderTransferList,
  rowNames,
  showSheet,
  typeBound,
  typeSearch,
} from '@/test/transferListHelpers';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

afterEach(jest.restoreAllMocks);

const RONALDO = 'Ronaldo de Assis Moreira';
const MESSI = 'Lionel Andres Messi';
const VALVERDE = 'Federico Valverde';
const LONG_TEXT = 'x'.repeat(100);
const RANGE_CHIP_LABEL = 'Filtro de valor: de 2.000 a 4.000 dólares';

const searchField = () => screen.getByLabelText('Nombre del destinatario');

// Color del borde de la caja del campo: con el foco, el del foco.
function searchBorderColor() {
  return StyleSheet.flatten(searchField().parent?.props.style)?.borderColor;
}

const clearButton = () => screen.queryByRole('button', { name: 'Borrar búsqueda' });

// Muestra la lista completa y espera a que termine la primera carga.
async function renderLoadedList() {
  await renderTransferList();
  expect(await screen.findByText('3 transferencias')).toBeOnTheScreen();
}

// Aplica Desde 2.000,00 y Hasta 4.000,00 por la hoja (Messi y Valverde) y busca «mes» (solo Messi).
async function applyRangeThenSearchMes() {
  await openSheet('Valor');
  await showSheet();
  await typeBound('Desde', '200000');
  await typeBound('Hasta', '400000');
  await applySheet();
  expect(rowNames()).toEqual([MESSI, VALVERDE]);
  await typeSearch('mes');
  expect(rowNames()).toEqual([MESSI]);
}

// Cada paso escribe o borra un solo carácter respecto al anterior.
const TYPING_STEPS = [
  { text: 'm', rows: [RONALDO, MESSI], counter: '2 de 3 transferencias' },
  { text: 'mo', rows: [RONALDO], counter: '1 de 3 transferencias' },
  { text: 'm', rows: [RONALDO, MESSI], counter: '2 de 3 transferencias' },
  { text: '', rows: [RONALDO, MESSI, VALVERDE], counter: '3 transferencias' },
  { text: 'e', rows: [RONALDO, MESSI, VALVERDE], counter: '3 de 3 transferencias' },
  { text: 'es', rows: [MESSI], counter: '1 de 3 transferencias' },
];

const CLEAR_BUTTON_STEPS = [
  { text: ' ', visible: true },
  { text: '   ', visible: true },
  { text: '', visible: false },
  { text: 'x', visible: true },
  { text: 'zzz', visible: true },
  { text: '', visible: false },
];

describe('TransferListScreen: búsqueda por nombre', () => {
  it.each([
    { partition: 'vacío', text: '', rows: [RONALDO, MESSI, VALVERDE] },
    { partition: 'solo espacios', text: '   ', rows: [RONALDO, MESSI, VALVERDE] },
    { partition: 'mayúsculas', text: 'MESSI', rows: [MESSI] },
    { partition: 'minúsculas y tilde', text: 'valvérde', rows: [VALVERDE] },
    { partition: 'espacios alrededor', text: '  messi  ', rows: [MESSI] },
    { partition: 'subcadena intermedia', text: 'de assis', rows: [RONALDO] },
    { partition: 'varias coincidencias', text: 're', rows: [RONALDO, MESSI] },
    { partition: 'dígitos de un documento', text: '110299', rows: [] },
    { partition: 'sin coincidencia', text: 'zzz', rows: [] },
    { partition: 'texto largo', text: LONG_TEXT, rows: [] },
  ])('al escribir cada texto se ven exactamente sus filas', async ({ text, rows }) => {
    await renderLoadedList();

    await typeSearch(text);

    expect(screen.getByLabelText('Nombre del destinatario')).toHaveDisplayValue(text);
    expect(rowNames()).toEqual(rows);
  });

  it('el campo acepta un texto de 100 caracteres completo', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderLoadedList();

    await user.type(screen.getByLabelText('Nombre del destinatario'), LONG_TEXT);

    expect(screen.getByLabelText('Nombre del destinatario')).toHaveDisplayValue(LONG_TEXT);
    expect(rowNames()).toEqual([]);
  });
});

describe('TransferListScreen: búsqueda en vivo', () => {
  it('cada carácter escrito o borrado actualiza filas y contador sin peticiones ni skeleton', async () => {
    await renderLoadedList();
    for (const { text, rows, counter } of TYPING_STEPS) {
      await typeSearch(text);

      expect(rowNames()).toEqual(rows);
      expect(screen.getByText(counter)).toBeOnTheScreen();
      expect(screen.queryByLabelText('Cargando…')).not.toBeOnTheScreen();
    }

    expect(listRequests()).toHaveLength(1);
  });

  it('el campo sigue siendo el mismo, con su texto y sin perder el foco', async () => {
    await renderLoadedList();
    const field = searchField();
    await fireEvent(field, 'focus');
    expect(searchBorderColor()).toBe(colors.focus);

    for (const text of ['z', 'zz', 'z', '', 'mes']) {
      await typeSearch(text);

      expect(searchField() === field).toBe(true);
      expect(searchField()).toHaveDisplayValue(text);
      expect(searchBorderColor()).toBe(colors.focus);
    }
  });
});

describe('TransferListScreen: botón Borrar búsqueda', () => {
  it('sin texto no hay Borrar búsqueda y con cualquier carácter sí, también con espacios', async () => {
    await renderLoadedList();
    expect(clearButton()).not.toBeOnTheScreen();

    for (const { text, visible } of CLEAR_BUTTON_STEPS) {
      await typeSearch(text);

      if (visible) expect(clearButton()).toBeOnTheScreen();
      else expect(clearButton()).not.toBeOnTheScreen();
    }
  });

  it('Borrar búsqueda vacía el campo, se oculta y respeta los otros filtros', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderLoadedList();
    await typeSearch('mes');
    expect(rowNames()).toEqual([MESSI]);

    await user.press(screen.getByRole('button', { name: 'Borrar búsqueda' }));

    expect(searchField()).toHaveDisplayValue('');
    expect(clearButton()).not.toBeOnTheScreen();
    expect(rowNames()).toEqual([RONALDO, MESSI, VALVERDE]);
    expect(screen.getByText('3 transferencias')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Filtro de valor: sin aplicar' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Filtro de fecha: sin aplicar' })).toBeOnTheScreen();
    expect(listRequests()).toHaveLength(1);

    await applyRangeThenSearchMes();

    await user.press(screen.getByRole('button', { name: 'Borrar búsqueda' }));

    expect(searchField()).toHaveDisplayValue('');
    expect(rowNames()).toEqual([MESSI, VALVERDE]);
    expect(screen.getByText('2 de 3 transferencias')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: RANGE_CHIP_LABEL })).toHaveTextContent('US$\u00a02.000–4.000');
    expect(listRequests()).toHaveLength(1);
  });
});

describe('TransferListScreen: foco tras Borrar búsqueda', () => {
  it('Borrar búsqueda devuelve el foco al campo y al lector', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    watchFocus();
    const focusEvents = spyOnFocusEvents();
    await renderLoadedList();
    await typeSearch('mes');

    await user.press(screen.getByRole('button', { name: 'Borrar búsqueda' }));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(16);
    });

    expect(focusedFieldLabels()).toEqual(['Nombre del destinatario']);
    expect(focusEvents()).toEqual(['Nombre del destinatario']);
  });
});
