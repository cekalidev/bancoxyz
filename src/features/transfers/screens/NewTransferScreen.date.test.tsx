import { fireEvent, screen } from 'expo-router/testing-library';

import { dismissPicker, lastPickerRequest } from '@/test/datePickerMock';
import { settleRequests, spyOnFocusEvents } from '@/test/homeHelpers';
import {
  chooseDate,
  fillValidForm,
  letPickerClose,
  pressDateField,
  renderTransferFlow,
  typeAmount,
  typeDocument,
} from '@/test/transferHelpers';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

async function openForm(now?: Date) {
  await renderTransferFlow({ now });
  await settleRequests();
}

const TODAY = { year: 2026, month: 10, day: 31 };
const NOV_15 = { year: 2026, month: 11, day: 15 };
const SPOKEN_TODAY = 'Fecha de la transferencia: hoy, 31 de octubre de 2026';
const SPOKEN_NOV_15 = 'Fecha de la transferencia: 15 de noviembre de 2026';

const BEFORE_TODAY = 'La fecha no puede ser anterior a hoy.';
const BEYOND_YEAR = 'Elige una fecha dentro del próximo año.';

afterEach(jest.restoreAllMocks);

// Posición del nodo en el recorrido del árbol, que es el orden visual.
function treeIndex(node: ReturnType<typeof screen.getByText>) {
  return screen.container.queryAll(() => true).indexOf(node);
}

function expectErrorUnderDate(message: string) {
  const error = screen.getByText(message);
  expect(treeIndex(error)).toBeGreaterThan(treeIndex(screen.getByRole('button', { name: /^Fecha de la transferencia/ })));
  expect(treeIndex(error)).toBeLessThan(treeIndex(screen.getByRole('button', { name: 'Continuar' })));
}

describe('NewTransferScreen: selector de fecha', () => {
  it.each([
    { name: '31/10/2026', now: new Date(2026, 9, 31, 10, 0), max: { year: 2027, month: 10, day: 31 } },
    { name: '29/02/2028', now: new Date(2028, 1, 29, 10, 0), max: { year: 2029, month: 2, day: 28 } },
  ])(
    'pulsar la fecha abre el selector con la fecha del campo, hoy como mínimo y hoy más un año como máximo: «$name»',
    async ({ now, max }) => {
      await openForm(now);
      const today = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };

      await pressDateField();

      expect(lastPickerRequest()).toMatchObject({ value: today, min: today, max });
    },
  );
});

describe('NewTransferScreen: aceptar o cancelar la fecha', () => {
  it.each([
    { name: 'otra fecha', picks: [NOV_15], shown: '15/11/2026', spoken: SPOKEN_NOV_15 },
    { name: 'hoy', picks: [NOV_15, TODAY], shown: 'Hoy, 31/10/2026', spoken: SPOKEN_TODAY },
  ])('al aceptar muestra Hoy o la fecha elegida y devuelve el foco al campo: «$name»', async ({ picks, shown, spoken }) => {
    await openForm();
    const focusEvents = spyOnFocusEvents();

    for (const date of picks) {
      await chooseDate(date);
      await letPickerClose();
    }

    expect(screen.getByText(shown)).toBeOnTheScreen();
    expect(focusEvents()).toEqual(picks.map(() => spoken));
  });

  it('al cancelar el campo no cambia y el foco vuelve a él', async () => {
    await openForm();
    await chooseDate(NOV_15);
    const focusEvents = spyOnFocusEvents();

    await pressDateField();
    await dismissPicker();
    await letPickerClose();

    expect(screen.getByText('15/11/2026')).toBeOnTheScreen();
    expect(focusEvents()).toEqual([SPOKEN_NOV_15]);
  });
});

describe('NewTransferScreen: foco tras cerrar el selector', () => {
  it('al aceptar muestra Hoy o la fecha elegida y devuelve el foco al campo: el foco llega después de cerrar el selector', async () => {
    await openForm();
    const focusEvents = spyOnFocusEvents();

    await chooseDate(NOV_15);
    expect(focusEvents()).toEqual([]);

    await letPickerClose();
    expect(focusEvents()).toEqual([SPOKEN_NOV_15]);
  });

  it('al cancelar el campo no cambia y el foco vuelve a él: el foco llega después de cerrar el selector', async () => {
    await openForm();
    await chooseDate(NOV_15);
    await letPickerClose();
    const focusEvents = spyOnFocusEvents();

    await pressDateField();
    await dismissPicker();
    expect(focusEvents()).toEqual([]);

    await letPickerClose();
    expect(focusEvents()).toEqual([SPOKEN_NOV_15]);
  });
});

describe('NewTransferScreen: validación de la fecha', () => {
  it.each([
    { name: 'ayer', date: { year: 2026, month: 10, day: 30 }, message: BEFORE_TODAY },
    { name: 'hoy', date: TODAY, message: null },
    { name: 'mañana', date: { year: 2026, month: 11, day: 1 }, message: null },
    { name: 'hoy + 1 año', date: { year: 2027, month: 10, day: 31 }, message: null },
    { name: 'hoy + 1 año + 1 día', date: { year: 2027, month: 11, day: 1 }, message: BEYOND_YEAR },
  ])('al continuar muestra el resultado de cada fecha: «$name»', async ({ date, message }) => {
    await openForm();
    await typeAmount('125000');
    await typeDocument('12345678900');
    await chooseDate(date);

    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));

    if (message !== null) expectErrorUnderDate(message);
    else for (const text of [BEFORE_TODAY, BEYOND_YEAR]) expect(screen.queryByText(text)).not.toBeOnTheScreen();
  });

  it('si la fecha tenía error se revalida al elegir otra', async () => {
    await openForm();
    await typeAmount('125000');
    await typeDocument('12345678900');
    await chooseDate({ year: 2026, month: 10, day: 30 });
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByText(BEFORE_TODAY)).toBeOnTheScreen();

    await chooseDate(NOV_15);

    expect(screen.queryByText(BEFORE_TODAY)).not.toBeOnTheScreen();
    expect(screen.getByText('Elige una fecha futura para programarla.')).toBeOnTheScreen();
  });
});

describe('NewTransferScreen: paso de la medianoche', () => {
  it('si pasa la medianoche con el formulario abierto, al continuar quita Hoy y muestra el error de fecha sin navegar', async () => {
    await openForm(new Date(2026, 9, 31, 23, 59, 30));
    await fillValidForm();
    expect(screen.getByText('Hoy, 31/10/2026')).toBeOnTheScreen();

    jest.setSystemTime(new Date(2026, 10, 1, 0, 0, 10));
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));

    expect(screen.queryByText('Hoy, 31/10/2026')).not.toBeOnTheScreen();
    expect(screen.getByText('31/10/2026')).toBeOnTheScreen();
    expectErrorUnderDate(BEFORE_TODAY);
    expect(screen).toHavePathname('/nueva-transferencia');
  });
});
