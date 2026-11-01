import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { Platform, Pressable, Text } from 'react-native';

import { useDatePicker } from '@/components/useDatePicker';
import type { DatePickerRequest } from '@/components/useDatePicker';

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
const CHOSEN = new Date(2026, 10, 20, 23, 30);
const CHOSEN_DAY = { year: 2026, month: 11, day: 20 };

type HarnessProps = { request: DatePickerRequest; inline?: boolean };

function Harness({ request, inline }: HarnessProps) {
  const picker = useDatePicker(inline === undefined ? undefined : { inline });
  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => picker.open(request)}>
        <Text>Abrir</Text>
      </Pressable>
      {picker.element}
    </>
  );
}

async function openPicker(os: 'ios' | 'android', request: DatePickerRequest, inline?: boolean) {
  jest.replaceProperty(Platform, 'OS', os);
  const view = await render(<Harness request={request} inline={inline} />);
  await pressButton('Abrir');
  return view;
}

async function pressButton(name: string) {
  await userEvent.setup().press(screen.getByRole('button', { name }));
}

function modals() {
  return screen.container.queryAll((node) => node.type === 'Modal');
}

function changeEvent(date: Date) {
  return { nativeEvent: { timestamp: date.getTime(), utcOffset: 0 } };
}

afterEach(jest.restoreAllMocks);

describe('useDatePicker sin límites', () => {
  it('en Android abre el diálogo sin mínimo ni máximo si no se piden', async () => {
    const open = jest.spyOn(DateTimePickerAndroid, 'open').mockImplementation(() => undefined);

    await openPicker('android', { value: VALUE, onPick: jest.fn(), onClose: jest.fn() });

    expect(open).toHaveBeenCalledTimes(1);
    const options = open.mock.calls[0][0];
    expect(options.mode).toBe('date');
    expect(options.value).toEqual(new Date(2026, 10, 15));
    expect(options).not.toHaveProperty('minimumDate');
    expect(options).not.toHaveProperty('maximumDate');
  });
});

describe('useDatePicker en iOS dentro de una hoja', () => {
  it('en iOS con inline el calendario no va en un Modal y se cierra al aceptar o cancelar', async () => {
    const request = { value: VALUE, onPick: jest.fn(), onClose: jest.fn() };
    const view = await openPicker('ios', request, true);

    const picker = screen.getByTestId(PICKER_ID);
    expect(picker.props.display).toBe('inline');
    expect(modals()).toHaveLength(0);
    await fireEvent(picker, 'valueChange', changeEvent(CHOSEN), CHOSEN);
    await pressButton('Aceptar');

    expect(request.onPick).toHaveBeenCalledTimes(1);
    expect(request.onPick).toHaveBeenCalledWith(CHOSEN_DAY);
    expect(request.onClose).not.toHaveBeenCalled();
    expect(screen.queryByTestId(PICKER_ID)).not.toBeOnTheScreen();

    await pressButton('Abrir');
    await pressButton('Cancelar');

    expect(request.onClose).toHaveBeenCalledTimes(1);
    expect(request.onPick).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId(PICKER_ID)).not.toBeOnTheScreen();

    await view.unmount();
    await openPicker('ios', { value: VALUE, onPick: jest.fn(), onClose: jest.fn() }, false);

    expect(modals()).toHaveLength(1);
    expect(screen.getByTestId(PICKER_ID)).toBeOnTheScreen();
  });
});
