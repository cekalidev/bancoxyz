import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { act, fireEvent, render, screen, userEvent, within } from '@testing-library/react-native';
import { Platform, Pressable, Text } from 'react-native';

import { useDatePicker } from '@/components/useDatePicker';
import type { DatePickerRequest } from '@/components/useDatePicker';
import { colors } from '@/theme';

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
const VALUE = { year: 2026, month: 11, day: 15 };
const MIN = { year: 2026, month: 10, day: 31 };
const MAX = { year: 2027, month: 10, day: 31 };
const CHOSEN = new Date(2026, 10, 20, 23, 30);
const CHOSEN_DAY = { year: 2026, month: 11, day: 20 };

function requestWith(overrides: Partial<DatePickerRequest> = {}): DatePickerRequest {
  return { value: VALUE, min: MIN, max: MAX, onPick: jest.fn(), onClose: jest.fn(), ...overrides };
}

function Harness({ request }: { request: DatePickerRequest }) {
  const picker = useDatePicker();
  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => picker.open(request)}>
        <Text>Abrir</Text>
      </Pressable>
      {picker.element}
    </>
  );
}

async function renderHarness(os: 'ios' | 'android', request = requestWith()) {
  jest.replaceProperty(Platform, 'OS', os);
  await render(<Harness request={request} />);
}

async function pressOpen() {
  await userEvent.setup().press(screen.getByRole('button', { name: 'Abrir' }));
}

async function openPicker(os: 'ios' | 'android', request = requestWith()) {
  await renderHarness(os, request);
  await pressOpen();
}

function changeEvent(date: Date) {
  return { nativeEvent: { timestamp: date.getTime(), utcOffset: 0 } };
}

function openedAndroidOptions() {
  const open = jest.spyOn(DateTimePickerAndroid, 'open').mockImplementation(() => undefined);
  return () => open.mock.calls[0][0];
}

async function choose(date: Date) {
  await fireEvent(screen.getByTestId(PICKER_ID), 'valueChange', changeEvent(date), date);
}

async function press(name: string) {
  await userEvent.setup().press(screen.getByRole('button', { name }));
}

afterEach(jest.restoreAllMocks);

describe('useDatePicker', () => {
  it('en Android abre el diálogo de fecha con valor, mínimo y máximo en hora local', async () => {
    const open = jest.spyOn(DateTimePickerAndroid, 'open').mockImplementation(() => undefined);

    await openPicker('android');

    expect(open).toHaveBeenCalledTimes(1);
    const options = open.mock.calls[0][0];
    expect(options.mode).toBe('date');
    expect(options.value).toEqual(new Date(2026, 10, 15));
    expect(options.minimumDate).toEqual(new Date(2026, 9, 31));
    expect(options.maximumDate).toEqual(new Date(2027, 9, 31));
    expect(options).not.toHaveProperty('onChange');
  });

  it('en iOS muestra el selector con los mismos límites', async () => {
    const open = jest.spyOn(DateTimePickerAndroid, 'open').mockImplementation(() => undefined);
    await renderHarness('ios');

    expect(screen.queryByTestId(PICKER_ID)).not.toBeOnTheScreen();

    await pressOpen();

    const [modal] = screen.container.queryAll((node) => node.type === 'Modal');
    expect(modal.props.transparent).toBe(true);
    const picker = screen.getByTestId(PICKER_ID);
    expect(picker.props.mode).toBe('date');
    expect(picker.props.display).toBe('inline');
    expect(picker.props.value).toEqual(new Date(2026, 10, 15));
    expect(picker.props.minimumDate).toEqual(new Date(2026, 9, 31));
    expect(picker.props.maximumDate).toEqual(new Date(2027, 9, 31));
    expect(open).not.toHaveBeenCalled();
  });
});

describe('useDatePicker en Android al elegir una fecha', () => {
  it('al aceptar entrega el día elegido y al cancelar solo avisa del cierre en Android', async () => {
    const options = openedAndroidOptions();
    const request = requestWith();
    await openPicker('android', request);

    options().onValueChange?.(changeEvent(CHOSEN), CHOSEN);

    expect(request.onPick).toHaveBeenCalledTimes(1);
    expect(request.onPick).toHaveBeenCalledWith(CHOSEN_DAY);
    expect(request.onClose).not.toHaveBeenCalled();

    options().onDismiss?.();

    expect(request.onClose).toHaveBeenCalledTimes(1);
    expect(request.onPick).toHaveBeenCalledTimes(1);
  });
});

describe('useDatePicker en iOS al aceptar o cancelar', () => {
  it('al aceptar entrega el día elegido y al cancelar solo avisa del cierre en iOS', async () => {
    const request = requestWith();
    await openPicker('ios', request);

    await choose(CHOSEN);
    expect(request.onPick).not.toHaveBeenCalled();

    await press('Aceptar');

    expect(request.onPick).toHaveBeenCalledTimes(1);
    expect(request.onPick).toHaveBeenCalledWith(CHOSEN_DAY);
    expect(request.onClose).not.toHaveBeenCalled();
    expect(screen.queryByTestId(PICKER_ID)).not.toBeOnTheScreen();

    await pressOpen();
    await press('Cancelar');

    expect(request.onClose).toHaveBeenCalledTimes(1);
    expect(request.onPick).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId(PICKER_ID)).not.toBeOnTheScreen();
  });

  it('al aceptar entrega el día elegido y al cancelar solo avisa del cierre: en iOS sin tocar el calendario entrega la fecha del campo', async () => {
    const request = requestWith();
    await openPicker('ios', request);

    await press('Aceptar');

    expect(request.onPick).toHaveBeenCalledWith(VALUE);
  });

});

describe('useDatePicker en iOS con el diálogo abierto', () => {
  it('al aceptar entrega el día elegido y al cancelar solo avisa del cierre: en iOS lo descartado no se conserva al volver a abrir', async () => {
    const request = requestWith();
    await openPicker('ios', request);
    await choose(CHOSEN);
    expect(screen.getByTestId(PICKER_ID).props.value).toEqual(new Date(2026, 10, 20));

    await press('Cancelar');
    await pressOpen();

    expect(screen.getByTestId(PICKER_ID).props.value).toEqual(new Date(2026, 10, 15));
    expect(request.onPick).not.toHaveBeenCalled();
  });

  it('al aceptar entrega el día elegido y al cancelar solo avisa del cierre: en iOS «Aceptar» es el botón principal y «Cancelar» el secundario', async () => {
    await openPicker('ios');

    const accept = screen.getByRole('button', { name: 'Aceptar' });
    const cancel = screen.getByRole('button', { name: 'Cancelar' });

    expect(within(accept).getByTestId('button-gradient')).toBeOnTheScreen();
    expect(within(cancel).queryByTestId('button-gradient')).not.toBeOnTheScreen();
  });
});

describe('useDatePicker en iOS aspecto del diálogo', () => {
  it('en iOS muestra el selector con los mismos límites: claro, en español y con el acento del tema', async () => {
    await openPicker('ios');

    const picker = screen.getByTestId(PICKER_ID);

    expect(picker.props.themeVariant).toBe('light');
    expect(picker.props.locale).toBe('es-ES');
    expect(picker.props.accentColor).toBe(colors.focus);
  });

  it('en iOS muestra el selector con los mismos límites: cerrar el diálogo del sistema equivale a cancelar', async () => {
    const request = requestWith();
    await openPicker('ios', request);

    const [modal] = screen.container.queryAll((node) => node.type === 'Modal');
    const dialog = screen.container.queryAll((node) => node.props.accessibilityViewIsModal === true);
    expect(dialog).toHaveLength(1);

    await act(async () => modal.props.onRequestClose?.());

    expect(request.onClose).toHaveBeenCalledTimes(1);
    expect(request.onPick).not.toHaveBeenCalled();
    expect(screen.queryByTestId(PICKER_ID)).not.toBeOnTheScreen();
  });
});
