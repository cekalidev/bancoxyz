import { useEffect } from 'react';

import type { ListView } from './types';
import type { ListFiltersControls } from './useListFilters';

// Si una recarga deja el listado sin datos con una hoja abierta, la hoja se cierra descartando lo no aplicado
// y el foco del lector va al encabezado del vacío: el chip que la abrió ya no existe.
// En el vacío no hay chips, así que una hoja abierta allí solo puede venir de la vista anterior.
export function useCloseSheetWhenEmpty(view: ListView, filters: ListFiltersControls) {
  const { openSheet, closeToEmpty } = filters;

  useEffect(() => {
    if (view === 'empty' && openSheet !== null) closeToEmpty();
  }, [view, openSheet, closeToEmpty]);
}
