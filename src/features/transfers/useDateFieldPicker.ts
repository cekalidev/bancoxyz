import { useEffect, useRef, type RefObject } from 'react';
import { AccessibilityInfo, type PressableInstance } from 'react-native';

import { useDatePicker } from '@/components/useDatePicker';
import { addOneYear, type CalendarDate } from '@/utils/date';

type DateFieldPickerOptions = {
  date: CalendarDate;
  today: CalendarDate;
  onPick: (date: CalendarDate) => void;
  fieldRef: RefObject<PressableInstance | null>;
};

// Abre el selector del sistema con la fecha del campo, entre hoy y hoy + 1 año.
// Al aceptar o cancelar, el lector de pantalla vuelve al campo de fecha.
export function useDateFieldPicker({ date, today, onPick, fieldRef }: DateFieldPickerOptions) {
  const picker = useDatePicker();
  const pendingFocus = useRef<number | null>(null);

  const cancelPendingFocus = () => {
    if (pendingFocus.current !== null) cancelAnimationFrame(pendingFocus.current);
    pendingFocus.current = null;
  };

  useEffect(() => cancelPendingFocus, []);

  // El foco se pide en el siguiente fotograma: mientras el selector se cierra, el lector de
  // pantalla aún está dentro de él y perdería el foco que se le envíe.
  const focusFieldAfterClose = () => {
    cancelPendingFocus();
    pendingFocus.current = requestAnimationFrame(() => {
      pendingFocus.current = null;
      if (fieldRef.current) AccessibilityInfo.sendAccessibilityEvent(fieldRef.current, 'focus');
    });
  };

  const openDatePicker = () =>
    picker.open({
      value: date,
      min: today,
      max: addOneYear(today),
      onPick: (picked) => {
        onPick(picked);
        focusFieldAfterClose();
      },
      onClose: focusFieldAfterClose,
    });

  return { openDatePicker, pickerElement: picker.element };
}
