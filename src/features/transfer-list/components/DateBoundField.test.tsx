import { createRef } from 'react';
import { render, screen, userEvent, within } from '@testing-library/react-native';
import type { PressableInstance } from 'react-native';

import type { CalendarDate } from '@/utils/date';

import { DateBoundField } from './DateBoundField';
import type { DateBoundFieldProps } from './DateBoundField';

const FIRST_OF_JUNE: CalendarDate = { year: 2024, month: 6, day: 1 };
const END_OF_JUNE: CalendarDate = { year: 2024, month: 6, day: 30 };
const OPEN_CALENDAR_HINT = 'Abre el calendario';
const NO_LIMIT = 'Sin límite';
const HIDDEN = { includeHiddenElements: true };

function fieldProps(props: Partial<DateBoundFieldProps> = {}): DateBoundFieldProps {
  return { label: 'Desde', date: FIRST_OF_JUNE, onPress: jest.fn(), onClear: jest.fn(), ...props };
}

type Expected = { label: string; text: string; spoken: string; hasDate: boolean };

function expectField({ label, text, spoken, hasDate }: Expected) {
  const word = label.toLowerCase();
  const field = screen.getByRole('button', { name: `Fecha ${word}: ${spoken}` });
  const clear = screen.queryByRole('button', { name: `Borrar fecha ${word}` });

  expect(field).toHaveProp('accessibilityHint', OPEN_CALENDAR_HINT);
  expect(within(field).getByText(text)).toBeOnTheScreen();
  expect(screen.getByText(label, HIDDEN)).toBeOnTheScreen();
  expect(screen.getAllByRole('button')).toHaveLength(hasDate ? 2 : 1);
  expect(clear !== null).toBe(hasDate);
}

describe('DateBoundField', () => {
  it('muestra la fecha o Sin límite, con su etiqueta hablada y la pista Abre el calendario, y el botón de borrar solo con fecha', async () => {
    const onPress = jest.fn();
    const onClear = jest.fn();
    const fieldRef = createRef<PressableInstance>();
    await render(<DateBoundField {...fieldProps({ onPress, onClear, fieldRef })} />);

    expectField({ label: 'Desde', text: '01/06/2024', spoken: '1 de junio de 2024', hasDate: true });
    expect(fieldRef.current).not.toBeNull();

    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Borrar fecha desde' }));

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();

    await user.press(screen.getByRole('button', { name: 'Fecha desde: 1 de junio de 2024' }));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);

    await screen.rerender(<DateBoundField {...fieldProps({ date: null })} />);

    expectField({ label: 'Desde', text: NO_LIMIT, spoken: 'sin límite', hasDate: false });

    await screen.rerender(<DateBoundField {...fieldProps({ label: 'Hasta', date: END_OF_JUNE })} />);

    expectField({ label: 'Hasta', text: '30/06/2024', spoken: '30 de junio de 2024', hasDate: true });

    await screen.rerender(<DateBoundField {...fieldProps({ label: 'Hasta', date: null })} />);

    expectField({ label: 'Hasta', text: NO_LIMIT, spoken: 'sin límite', hasDate: false });
  });
});
