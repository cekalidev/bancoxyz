import { useRef, useState } from 'react';
import type { TextInputInstance } from 'react-native';

import { useFocusOnNextFrame } from '@/components/useFocusOnNextFrame';

import { changeBound, clearBound, draftFromBounds, submitDraft } from './amountBounds';
import type { AmountBounds, BoundField } from './types';

// Borrador de la hoja de valor: parte del filtro aplicado y se descarta al cerrar la hoja.
export function useAmountDraft(applied: AmountBounds, onApply: (bounds: AmountBounds) => void) {
  const [draft, setDraft] = useState(() => draftFromBounds(applied));
  const fromRef = useRef<TextInputInstance>(null);
  const toRef = useRef<TextInputInstance>(null);
  const focusLater = useFocusOnNextFrame();

  const change = (field: BoundField, text: string) =>
    setDraft((current) => changeBound(current, field, text));

  // Vacía el extremo y deja el foco en él: el teclado con focus() y el lector en el siguiente fotograma.
  const clear = (field: BoundField) => {
    const ref = field === 'from' ? fromRef : toRef;
    setDraft((current) => clearBound(current, field));
    ref.current?.focus();
    focusLater(ref);
  };

  // Con un rango válido lo entrega; con error de rango la hoja sigue abierta, nada se aplica
  // y el foco va a «Hasta», donde se muestra el error.
  const apply = () => {
    const result = submitDraft(draft);
    setDraft(result.draft);
    if (result.bounds === null) toRef.current?.focus();
    else onApply(result.bounds);
  };

  return { draft, fromRef, toRef, change, clear, apply };
}
