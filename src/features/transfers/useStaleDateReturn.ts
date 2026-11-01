import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { AccessibilityInfo } from 'react-native';

import { todayLocal } from '@/utils/date';

import { consumeStaleDate } from './transferActions';
import type { useTransferFields } from './useTransferFields';
import { validateDate } from './validateTransfer';

type TransferFields = ReturnType<typeof useTransferFields>;

// Al volver de la confirmación porque la fecha caducó, el formulario se pone al día:
// recalcula «hoy», muestra el error de la fecha y lleva el foco a ella.
export function useStaleDateReturn(fields: TransferFields): void {
  const { setToday, setErrors, values, refs } = fields;
  const { date } = values;
  const { dateRef } = refs;

  useFocusEffect(
    useCallback(() => {
      if (!consumeStaleDate()) return;
      const today = todayLocal();
      setToday(today);
      setErrors((current) => ({ ...current, date: validateDate(date, today) }));
      if (dateRef.current) AccessibilityInfo.sendAccessibilityEvent(dateRef.current, 'focus');
    }, [setToday, setErrors, date, dateRef]),
  );
}
