import { act, fireEvent, screen } from 'expo-router/testing-library';

import {
  applySheet,
  listRequests,
  openSheet,
  renderTransferList,
  rowNames,
  showSheet,
  spyOnReaderFocus,
  typeBound,
  typeSearch,
} from '@/test/transferListHelpers';
import { applyDateRange, prefixOf } from '@/test/transferListSheetHelpers';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

afterEach(jest.restoreAllMocks);

const TITLE = 'Filtrar por valor';
const MESSI = 'Lionel Andres Messi';
const VALVERDE = 'Federico Valverde';
const RONALDO = 'Ronaldo de Assis Moreira';
const RANGE_CHIP_LABEL = 'Filtro de valor: de 2.000 a 4.000 dólares';
const UNFILTERED_CHIP_LABEL = 'Filtro de valor: sin aplicar';
const DATE_CHIP_LABEL = 'Filtro de fecha: del 12 de junio de 2024 al 25 de agosto de 2024';
const JUN_12 = { year: 2024, month: 6, day: 12 };
const AUG_25 = { year: 2024, month: 8, day: 25 };

const sheetTitle = () => screen.queryByRole('header', { name: TITLE });
const boundField = (label: 'Desde' | 'Hasta') => screen.getByLabelText(label);

async function renderLoadedList() {
  await renderTransferList();
  expect(await screen.findByText('3 transferencias')).toBeOnTheScreen();
}

// Abre la hoja, escribe Desde 2.000,00 y Hasta 4.000,00 y la aplica.
async function applyRange() {
  await openSheet('Valor');
  await showSheet();
  await typeBound('Desde', '200000');
  await typeBound('Hasta', '400000');
  await applySheet();
}

type BoundLabel = 'Desde' | 'Hasta';
const BOUND_LABELS: BoundLabel[] = ['Desde', 'Hasta'];

// Borra el último carácter del campo, como la tecla de borrar.
async function eraseBound(label: BoundLabel, times: number) {
  for (let step = 0; step < times; step += 1) {
    const input = boundField(label);
    await fireEvent.changeText(input, String(input.props.value ?? '').slice(0, -1));
  }
}

const TYPING_CASES: { partition: string; edit: (label: BoundLabel) => Promise<void>; shown: string }[] = [
  { partition: 'tecla a tecla', edit: (label) => typeBound(label, '125000'), shown: '1.250,00' },
  {
    partition: 'pegar',
    edit: (label) => fireEvent.changeText(boundField(label), '1.250,00'),
    shown: '1.250,00',
  },
  {
    partition: 'decimotercer dígito',
    edit: async (label) => {
      await typeBound(label, '123456789012');
      expect(boundField(label)).toHaveDisplayValue('1.234.567.890,12');
      await typeBound(label, '3');
    },
    shown: '1.234.567.890,12',
  },
  { partition: 'letras', edit: (label) => typeBound(label, 'a1b2'), shown: '0,12' },
  {
    partition: 'borrar hasta 0',
    edit: async (label) => {
      await typeBound(label, '12');
      await eraseBound(label, 2);
    },
    shown: '',
  },
];

describe('TransferListScreen: abrir la hoja de valor', () => {
  it('el chip Valor abre la hoja con su título como encabezado y con el foco, campos vacíos con US$ y sin Quitar filtro', async () => {
    const readerFocus = spyOnReaderFocus();
    await renderLoadedList();

    await openSheet('Valor');
    expect(sheetTitle()).toBeOnTheScreen();
    await showSheet();

    expect(readerFocus()).toEqual([TITLE]);
    expect(screen.getByRole('button', { name: 'Cerrar filtro de valor' })).toBeOnTheScreen();
    for (const label of BOUND_LABELS) {
      expect(boundField(label)).toHaveDisplayValue('');
      expect(boundField(label).props.placeholder).toBe('0,00');
      expect(prefixOf(label)).toEqual(['US$']);
    }
    expect(screen.getByRole('button', { name: 'Aplicar' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Quitar filtro' })).not.toBeOnTheScreen();
  });

  it('abrir la hoja no pide nada', async () => {
    await renderLoadedList();
    expect(listRequests()).toHaveLength(1);

    await openSheet('Valor');
    expect(sheetTitle()).toBeOnTheScreen();
    await showSheet();

    expect(listRequests()).toHaveLength(1);
  });
});

describe('TransferListScreen: escribir en la hoja de valor', () => {
  it.each(TYPING_CASES)(
    'Desde y Hasta se escriben por la derecha en centavos, con doce dígitos e ignorando lo que no es dígito',
    async ({ edit, shown }) => {
      await renderLoadedList();
      await openSheet('Valor');

      for (const label of BOUND_LABELS) {
        await edit(label);

        expect(boundField(label)).toHaveDisplayValue(shown);
      }
    },
  );

  // El saldo de la cuenta en los datos simulados es 1.800,00.
  it('no hay tope por saldo', async () => {
    await renderLoadedList();
    await openSheet('Valor');

    for (const label of BOUND_LABELS) {
      await typeBound(label, '999999999999');

      expect(boundField(label)).toHaveDisplayValue('9.999.999.999,99');
    }
  });
});

describe('TransferListScreen: aplicar el filtro de valor', () => {
  it('Aplicar cierra la hoja, devuelve el foco al chip y actualiza filas, contador y chip sin peticiones', async () => {
    const readerFocus = spyOnReaderFocus();
    await renderLoadedList();

    await applyRange();

    expect(sheetTitle()).not.toBeOnTheScreen();
    expect(readerFocus().at(-1)).toBe(RANGE_CHIP_LABEL);
    expect(rowNames()).toEqual([MESSI, VALVERDE]);
    expect(screen.getByText('2 de 3 transferencias')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: RANGE_CHIP_LABEL })).toHaveTextContent('US$\u00a02.000–4.000');
    expect(screen.queryByLabelText('Cargando…')).not.toBeOnTheScreen();
    expect(listRequests()).toHaveLength(1);
  });
});

describe('TransferListScreen: reabrir la hoja de valor', () => {
  it('con el filtro aplicado la hoja trae sus valores y Quitar filtro', async () => {
    await renderLoadedList();
    await applyRange();

    await openSheet('Valor');

    expect(sheetTitle()).toBeOnTheScreen();
    expect(boundField('Desde')).toHaveDisplayValue('2.000,00');
    expect(boundField('Hasta')).toHaveDisplayValue('4.000,00');
    expect(screen.getByRole('button', { name: 'Quitar filtro' })).toBeOnTheScreen();
  });
});

describe('TransferListScreen: quitar el filtro de valor', () => {
  it('Aplicar con los dos campos vacíos quita el filtro', async () => {
    await renderLoadedList();
    await applyRange();
    await openSheet('Valor');

    for (const label of BOUND_LABELS) await fireEvent.changeText(boundField(label), '');
    await applySheet();

    expect(sheetTitle()).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: UNFILTERED_CHIP_LABEL })).toHaveTextContent('Valor');
    expect(rowNames()).toEqual([RONALDO, MESSI, VALVERDE]);
    expect(screen.getByText('3 transferencias')).toBeOnTheScreen();
  });
});

describe('TransferListScreen: quitar el filtro de valor con búsqueda y fecha', () => {
  it('Quitar filtro quita solo el de valor y cierra la hoja', async () => {
    const readerFocus = spyOnReaderFocus();
    await renderLoadedList();
    await typeSearch('mes');
    await applyDateRange(JUN_12, AUG_25);
    await applyRange();
    expect(rowNames()).toEqual([MESSI]);
    await openSheet('Valor');

    await fireEvent.press(screen.getByRole('button', { name: 'Quitar filtro' }));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(16);
    });

    expect(sheetTitle()).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: UNFILTERED_CHIP_LABEL })).toHaveTextContent('Valor');
    expect(readerFocus().at(-1)).toBe(UNFILTERED_CHIP_LABEL);
    expect(screen.getByLabelText('Nombre del destinatario')).toHaveDisplayValue('mes');
    expect(rowNames()).toEqual([MESSI]);
    expect(screen.getByText('1 de 3 transferencias')).toBeOnTheScreen();
    expect(listRequests()).toHaveLength(1);
    expect(screen.getByRole('button', { name: DATE_CHIP_LABEL })).toHaveTextContent('12/06/2024–25/08/2024');
    // Sin la búsqueda solo queda la fecha: vuelve Ronaldo (1.000), que el rango de valor dejaba fuera.
    await typeSearch('');
    expect(rowNames()).toEqual([RONALDO, MESSI, VALVERDE]);
    expect(screen.getByText('3 de 3 transferencias')).toBeOnTheScreen();
  });
});
