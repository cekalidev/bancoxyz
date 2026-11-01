import { useRef } from 'react';
import type { HostInstance, PressableInstance, TextInputInstance } from 'react-native';

import { useFocusOnNextFrame } from '@/components/useFocusOnNextFrame';

import type { FilterSheet } from './types';

// Refs a las que vuelve el foco tras cada acción de los filtros del listado.
export function useFilterFocus() {
  const searchRef = useRef<TextInputInstance>(null);
  const amountChipRef = useRef<PressableInstance>(null);
  const dateChipRef = useRef<PressableInstance>(null);
  const emptyTitleRef = useRef<HostInstance>(null);
  const focusLater = useFocusOnNextFrame();

  // Solo el lector, en el siguiente fotograma: sin focus() no se abre el teclado.
  const focusSearchReader = () => focusLater(searchRef);
  // El teclado con focus() y el lector en el siguiente fotograma.
  const focusSearch = () => {
    searchRef.current?.focus();
    focusSearchReader();
  };
  // El lector vuelve al chip de la hoja.
  const focusChip = (sheet: Exclude<FilterSheet, null>) =>
    focusLater(sheet === 'date' ? dateChipRef : amountChipRef);
  // El lector va al encabezado del vacío sin datos.
  const focusEmptyTitle = () => focusLater(emptyTitleRef);

  return {
    refs: { searchRef, amountChipRef, dateChipRef, emptyTitleRef },
    focusSearch,
    focusSearchReader,
    focusChip,
    focusEmptyTitle,
  };
}
