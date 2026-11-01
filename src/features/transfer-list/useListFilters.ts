import { useReducer, type Dispatch } from 'react';

import { INITIAL_LIST_FILTERS_STATE, listFiltersReducer, type ListFiltersAction } from './listFilters';
import type { AmountBounds, DateBounds, FilterSheet } from './types';
import { useFilterFocus } from './useFilterFocus';

type FocusChip = (sheet: Exclude<FilterSheet, null>) => void;

// Aplicar o quitar el filtro de una hoja la cierra y devuelve el foco del lector a su chip.
function sheetActions(dispatch: Dispatch<ListFiltersAction>, focusChip: FocusChip) {
  return {
    applyAmount: (bounds: AmountBounds) => {
      dispatch({ type: 'applyAmount', bounds });
      focusChip('amount');
    },
    removeAmount: () => {
      dispatch({ type: 'removeAmount' });
      focusChip('amount');
    },
    applyDates: (bounds: DateBounds) => {
      dispatch({ type: 'applyDates', bounds });
      focusChip('date');
    },
    removeDates: () => {
      dispatch({ type: 'removeDates' });
      focusChip('date');
    },
  };
}

// Estado local de los filtros del listado (se pierde al salir) y las refs a las que vuelve el foco.
export function useListFilters() {
  const [state, dispatch] = useReducer(listFiltersReducer, INITIAL_LIST_FILTERS_STATE);
  const { refs, focusSearch, focusSearchReader, focusChip, focusEmptyTitle } = useFilterFocus();

  // Vacía la búsqueda y deja el foco en el campo.
  const clearQuery = () => {
    dispatch({ type: 'clearQuery' });
    focusSearch();
  };
  const open = (sheet: Exclude<FilterSheet, null>) => dispatch({ type: 'open', sheet });
  // Al cerrar sin aplicar, el foco del lector vuelve al chip que abrió la hoja.
  const close = () => {
    dispatch({ type: 'close' });
    focusChip(state.openSheet === 'date' ? 'date' : 'amount');
  };
  // Cierra la hoja sin volver a su chip: el foco va al encabezado del vacío.
  const closeToEmpty = () => {
    dispatch({ type: 'close' });
    focusEmptyTitle();
  };
  // Quita los tres filtros; el lector va a la búsqueda sin abrir el teclado.
  const clearAll = () => {
    dispatch({ type: 'clearAll' });
    focusSearchReader();
  };

  const actions = { clearQuery, open, close, closeToEmpty, clearAll, ...sheetActions(dispatch, focusChip) };

  return { ...state, ...refs, dispatch, ...actions };
}

export type ListFiltersControls = ReturnType<typeof useListFilters>;
