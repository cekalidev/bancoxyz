import { useRef, useState } from 'react';
import type { PressableInstance } from 'react-native';

import { useDatePicker } from '@/components/useDatePicker';
import { useFocusOnNextFrame } from '@/components/useFocusOnNextFrame';
import { todayLocal } from '@/utils/date';

import { clearBound, pickerRequestFor, setBound } from './datePickerBounds';
import type { BoundField, DateBounds } from './types';

// Borrador de la hoja de fecha: parte del filtro aplicado y se descarta al cerrar la hoja.
export function useDateDraft(applied: DateBounds, onApply: (bounds: DateBounds) => void) {
  const [draft, setDraft] = useState<DateBounds>(applied);
  const fromRef = useRef<PressableInstance>(null);
  const toRef = useRef<PressableInstance>(null);
  const picker = useDatePicker({ inline: true });
  const focusLater = useFocusOnNextFrame();

  // El selector abre en la fecha del campo (o en hoy, o en la del otro) y no deja cruzar el otro extremo.
  // Al aceptar o cancelar, el lector vuelve al campo cuando el selector ya se cerró.
  const refOf = (field: BoundField) => (field === 'from' ? fromRef : toRef);
  const open = (field: BoundField) => {
    const ref = refOf(field);
    picker.open({
      ...pickerRequestFor(field, draft, todayLocal()),
      onPick: (date) => {
        setDraft((current) => setBound(current, field, date));
        focusLater(ref);
      },
      onClose: () => focusLater(ref),
    });
  };

  // Vaciar un extremo no abre teclado (el campo no es de texto): solo el lector vuelve al campo.
  const clear = (field: BoundField) => {
    setDraft((current) => clearBound(current, field));
    focusLater(refOf(field));
  };

  const apply = () => onApply(draft);

  return { draft, fromRef, toRef, picker, open, clear, apply };
}
