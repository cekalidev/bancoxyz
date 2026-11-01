import { act } from '@testing-library/react-native';

import type { DatePicker, DatePickerRequest } from '@/components/useDatePicker';
import type { CalendarDate } from '@/utils/date';

let lastRequest: DatePickerRequest | null = null;

// Cada test parte sin petición: así no lee la del test anterior.
beforeEach(() => {
  lastRequest = null;
});

// Mismo objeto en cada render, como el `open` estable del hook real.
const fakePicker: DatePicker = {
  open: (request) => {
    lastRequest = request;
  },
  element: null,
};

// Cada archivo de test lo declara arriba (un `jest.mock` dentro de un helper no se iza):
// jest.mock('@/components/useDatePicker', () =>
//   jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
// );
export function datePickerMockFactory(): { useDatePicker: () => DatePicker } {
  return { useDatePicker: () => fakePicker };
}

export function lastPickerRequest(): DatePickerRequest {
  if (!lastRequest) throw new Error('El selector de fecha no se ha abierto');
  return lastRequest;
}

// Equivale a pulsar «Aceptar» con ese día.
export function pickDate(date: CalendarDate): Promise<void> {
  return act(async () => lastPickerRequest().onPick(date));
}

// Equivale a cancelar o cerrar el selector.
export function dismissPicker(): Promise<void> {
  return act(async () => lastPickerRequest().onClose());
}
