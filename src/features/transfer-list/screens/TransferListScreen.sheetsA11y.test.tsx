import { fireEvent, screen, within } from 'expo-router/testing-library';
import { Platform } from 'react-native';

import { readingOrder } from '@/test/a11yTree';
import { pickDate } from '@/test/datePickerMock';
import { KEYBOARD, openKeyboardOver } from '@/test/keyboard';
import { RANGE_ERROR, type Scenario } from '@/test/transferListA11yHelpers';
import { applySheet, openSheet, sheetModal, showSheet } from '@/test/transferListHelpers';
import {
  applyAmountRange,
  applyDateRange,
  boundField,
  fillAmountSheet,
  pressClearBound,
  renderLoadedList,
  typeShownAmount,
} from '@/test/transferListSheetHelpers';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

afterEach(jest.restoreAllMocks);

const CALENDAR_HINT = 'Abre el calendario';

describe('TransferListScreen: campos de las hojas', () => {
  it('los campos de valor dicen el importe hablado o sin límite', async () => {
    await renderLoadedList();
    await fillAmountSheet('2.000,00', '');

    expect(boundField('Desde')).toHaveAccessibilityValue({ text: '2.000,00 dólares' });
    expect(boundField('Hasta')).toHaveAccessibilityValue({ text: 'sin límite' });
    expect(readingOrder(sheetModal()).filter((name) => name.includes('US$'))).toEqual([]);
  });

  it('los campos de fecha son botones con su etiqueta hablada y la pista Abre el calendario', async () => {
    await renderLoadedList();
    await openSheet('Fecha');
    await showSheet();
    await fireEvent.press(screen.getAllByHintText(CALENDAR_HINT)[0]);
    await pickDate({ year: 2024, month: 6, day: 1 });

    const fields = screen.getAllByHintText(CALENDAR_HINT);
    for (const field of fields) expect(field).toHaveProp('accessibilityRole', 'button');
    expect(fields.map((field) => field.props.accessibilityLabel)).toEqual([
      'Fecha desde: 1 de junio de 2024',
      'Fecha hasta: sin límite',
    ]);
  });
});

const JUNE_1 = { year: 2024, month: 6, day: 1 };
const JUNE_30 = { year: 2024, month: 6, day: 30 };

async function reopenSheet(chip: 'Valor' | 'Fecha') {
  await openSheet(chip);
  await showSheet();
}

const amountSheetScenarios: (Scenario & { order: string[] })[] = [
  {
    state: 'sin opcionales',
    arrange: async () => {
      await renderLoadedList();
      await reopenSheet('Valor');
    },
    order: ['Filtrar por valor', 'Cerrar filtro de valor', 'Desde', 'Hasta', 'Aplicar'],
  },
  {
    state: 'con borrar, error y Quitar filtro',
    arrange: async () => {
      await renderLoadedList();
      await applyAmountRange('1.000,00', '2.000,00');
      await reopenSheet('Valor');
      await pressClearBound('Desde');
      await typeShownAmount('Desde', '5.000,00');
      await applySheet();
    },
    order: [
      'Filtrar por valor',
      'Cerrar filtro de valor',
      'Desde',
      'Borrar valor desde',
      'Hasta',
      'Borrar valor hasta',
      RANGE_ERROR,
      'Aplicar',
      'Quitar filtro',
    ],
  },
];

const dateSheetScenarios: (Scenario & { order: string[] })[] = [
  {
    state: 'sin opcionales',
    arrange: async () => {
      await renderLoadedList();
      await reopenSheet('Fecha');
    },
    order: ['Filtrar por fecha', 'Cerrar filtro de fecha', 'Fecha desde: sin límite', 'Fecha hasta: sin límite', 'Aplicar'],
  },
  {
    state: 'con borrar y Quitar filtro',
    arrange: async () => {
      await renderLoadedList();
      await applyDateRange(JUNE_1, JUNE_30);
      await reopenSheet('Fecha');
    },
    order: [
      'Filtrar por fecha',
      'Cerrar filtro de fecha',
      'Fecha desde: 1 de junio de 2024',
      'Borrar fecha desde',
      'Fecha hasta: 30 de junio de 2024',
      'Borrar fecha hasta',
      'Aplicar',
      'Quitar filtro',
    ],
  },
];

describe('TransferListScreen: orden de lectura de las hojas', () => {
  it.each(amountSheetScenarios)(
    'el orden de la hoja de valor es título, cerrar, campos con sus borrar, error, Aplicar y Quitar filtro',
    async ({ arrange, order }) => {
      await arrange();

      expect(readingOrder(sheetModal())).toEqual(order);
    },
  );

  it.each(dateSheetScenarios)('el orden de la hoja de fecha', async ({ arrange, order }) => {
    await arrange();

    expect(readingOrder(sheetModal())).toEqual(order);
  });
});

// El scroll interno de la hoja abierta: el que contiene «Aplicar».
function sheetScrollView() {
  const scrolls = sheetModal()?.queryAll((node) => node.type === 'RCTScrollView') ?? [];
  const sheet = scrolls.find((node) => within(node).queryByRole('button', { name: 'Aplicar' }) !== null);
  if (!sheet) throw new Error('No hay scroll con el contenido de la hoja');
  return sheet;
}

describe('TransferListScreen: hojas con letra grande y teclado', () => {
  it.each(['Valor', 'Fecha'] as const)(
    'las hojas desplazan su contenido y mantienen los toques con el teclado abierto',
    async (chip) => {
      jest.replaceProperty(Platform, 'OS', 'ios');
      await renderLoadedList();
      await openSheet(chip);
      await showSheet();
      const scroll = sheetScrollView();
      const avoiding = scroll.parent?.parent;
      if (!avoiding) throw new Error('El scroll de la hoja no está dentro del contenedor que esquiva el teclado');

      expect(scroll).toHaveProp('keyboardShouldPersistTaps', 'handled');
      expect(await openKeyboardOver(avoiding)).toBe(KEYBOARD.height);
    },
  );
});
