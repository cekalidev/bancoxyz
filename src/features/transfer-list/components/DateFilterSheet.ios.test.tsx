import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { getBackdrop, getModal } from '@/components/BottomSheet.cases';
import { spyOnReaderFocus } from '@/test/transferListHelpers';

import type { DateBounds } from '../types';
import { DateFilterSheet } from './DateFilterSheet';

jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = jest.requireActual('react-native');
  const { createElement } = jest.requireActual('react');
  return {
    __esModule: true,
    ...jest.requireActual('@react-native-community/datetimepicker'),
    default: function MockDateTimePicker(props: object) {
      return createElement(View, { ...props, testID: 'date-time-picker' });
    },
  };
});

const PICKER_ID = 'date-time-picker';
const NO_DATES: DateBounds = { from: null, to: null };
const CHOSEN = new Date(2024, 5, 1, 12, 0);

type SheetCallbacks = { onApply: jest.Mock; onRemove: jest.Mock; onClose: jest.Mock };

function modals() {
  return screen.container.queryAll((node) => node.type === 'Modal');
}

// Monta la hoja en iOS y espera a que conozca la preferencia de movimiento y se muestre.
async function renderIosSheet(): Promise<SheetCallbacks> {
  jest.replaceProperty(Platform, 'OS', 'ios');
  const callbacks = { onApply: jest.fn(), onRemove: jest.fn(), onClose: jest.fn() };
  await render(<DateFilterSheet applied={NO_DATES} {...callbacks} />);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(0);
  });
  return callbacks;
}

async function openCalendar(label: 'desde' | 'hasta') {
  await fireEvent.press(screen.getByRole('button', { name: `Fecha ${label}: sin límite` }));
  await act(async () => {
    await jest.advanceTimersByTimeAsync(16);
  });
}

// Pulsa un botón del paso de calendario y deja pasar el fotograma en que llega el foco del lector.
async function pressAndSettle(name: string) {
  await fireEvent.press(screen.getByRole('button', { name }));
  await act(async () => {
    await jest.advanceTimersByTimeAsync(16);
  });
}

async function chooseInCalendar(date: Date) {
  await fireEvent(screen.getByTestId(PICKER_ID), 'valueChange', { nativeEvent: { timestamp: date.getTime() } }, date);
}

const CLOSE_WAYS: { way: string; close: () => Promise<void> }[] = [
  { way: 'el fondo', close: () => fireEvent.press(getBackdrop()) },
  { way: 'la ✕', close: () => fireEvent.press(screen.getByRole('button', { name: 'Cerrar filtro de fecha' })) },
  { way: 'atrás', close: () => fireEvent(getModal(), 'requestClose') },
];

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('DateFilterSheet en iOS: paso de calendario', () => {
  it('en iOS al pulsar un campo la misma hoja muestra el calendario en lugar de los campos y hay un solo Modal', async () => {
    await renderIosSheet();

    await openCalendar('desde');

    expect(screen.queryByTestId(PICKER_ID)).toBeOnTheScreen();
    expect(screen.getByTestId(PICKER_ID).props.display).toBe('inline');
    expect(screen.getByRole('header', { name: 'Filtrar por fecha' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Fecha (desde|hasta): / })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Aplicar' })).not.toBeOnTheScreen();
    expect(modals()).toHaveLength(1);
  });

  it.each(CLOSE_WAYS)('tocar el fondo o cerrar durante el calendario cierra la hoja entera sin aplicar', async ({ close }) => {
    const { onApply, onRemove, onClose } = await renderIosSheet();
    await openCalendar('desde');
    expect(screen.queryByTestId(PICKER_ID)).toBeOnTheScreen();
    await chooseInCalendar(CHOSEN);

    await close();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onApply).not.toHaveBeenCalled();
    expect(onRemove).not.toHaveBeenCalled();
  });
});

describe('DateFilterSheet en iOS: foco en el paso de calendario', () => {
  it('al entrar en el calendario el foco va al título de la hoja', async () => {
    const readerFocus = spyOnReaderFocus();
    await renderIosSheet();

    await openCalendar('hasta');

    expect(screen.queryByTestId(PICKER_ID)).toBeOnTheScreen();
    expect(readerFocus().at(-1)).toBe('Filtrar por fecha');
  });

  it('Aceptar vuelve a los campos con la fecha y Cancelar sin cambios, con el foco en el campo', async () => {
    const readerFocus = spyOnReaderFocus();
    await renderIosSheet();

    await openCalendar('desde');
    await chooseInCalendar(CHOSEN);
    await pressAndSettle('Aceptar');

    expect(screen.queryByTestId(PICKER_ID)).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Fecha desde: 1 de junio de 2024' })).toHaveTextContent('01/06/2024');
    expect(readerFocus().at(-1)).toBe('Fecha desde: 1 de junio de 2024');

    await openCalendar('hasta');
    await chooseInCalendar(new Date(2024, 5, 30, 12, 0));
    await pressAndSettle('Cancelar');

    expect(screen.queryByTestId(PICKER_ID)).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Fecha hasta: sin límite' })).toHaveTextContent('Sin límite');
    expect(readerFocus().at(-1)).toBe('Fecha hasta: sin límite');
  });
});
