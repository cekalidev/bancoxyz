import type { Ref } from 'react';
import type { PressableInstance } from 'react-native';

import { ClearButton } from '@/components/ClearButton';
import { DateField } from '@/components/DateField';
import { formatDisplayDate } from '@/utils/date';
import type { CalendarDate } from '@/utils/date';
import { spokenDate } from '@/utils/spokenDate';

const NO_LIMIT = 'Sin límite';

export type DateBoundFieldProps = {
  label: 'Desde' | 'Hasta';
  date: CalendarDate | null;
  onPress: () => void;
  onClear: () => void;
  fieldRef?: Ref<PressableInstance>;
};

export function DateBoundField({ label, date, onPress, onClear, fieldRef }: DateBoundFieldProps) {
  const word = label.toLowerCase();

  return (
    <DateField
      label={label}
      text={date ? formatDisplayDate(date) : NO_LIMIT}
      spokenLabel={`Fecha ${word}: ${date ? spokenDate(date) : 'sin límite'}`}
      onPress={onPress}
      fieldRef={fieldRef}
      right={date ? <ClearButton label={`Borrar fecha ${word}`} onPress={onClear} /> : null}
    />
  );
}
