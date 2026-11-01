import { useEffect, useRef, type RefObject } from 'react';
import type { FlatList } from 'react-native';

import { useReducedMotion } from '@/components/useReducedMotion';

import type { RefreshNotice } from './components/ListTop';

// El aviso de una recarga fallida vive en la cabecera de la lista: si estaba desplazada, quedaría
// fuera de la vista. Al aparecer, la lista vuelve arriba; el foco del lector no se mueve (el aviso ya se anuncia).
export function useScrollTopOnNotice<T>(listRef: RefObject<FlatList<T> | null>, notice: RefreshNotice, hasRows: boolean) {
  const reducedMotion = useReducedMotion();
  const shownErrorId = useRef(notice.errorId);
  const { errorId, message } = notice;

  useEffect(() => {
    if (errorId === shownErrorId.current) return;
    shownErrorId.current = errorId;
    if (message && hasRows) listRef.current?.scrollToOffset({ offset: 0, animated: !reducedMotion });
  }, [errorId, message, hasRows, reducedMotion, listRef]);
}
