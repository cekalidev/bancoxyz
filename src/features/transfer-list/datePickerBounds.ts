import { compareDates } from '@/utils/date';
import type { CalendarDate } from '@/utils/date';

import type { BoundField, DateBounds } from './types';

export type PickerRequest = { value: CalendarDate; min?: CalendarDate; max?: CalendarDate };

function allowedByOther(field: BoundField, date: CalendarDate, other: CalendarDate): boolean {
  const order = compareDates(date, other);

  return field === 'from' ? order <= 0 : order >= 0;
}

function limitsFrom(field: BoundField, other: CalendarDate | null): Omit<PickerRequest, 'value'> {
  if (!other) return {};

  return field === 'from' ? { max: other } : { min: other };
}

export function pickerRequestFor(
  field: BoundField,
  draft: DateBounds,
  today: CalendarDate,
): PickerRequest {
  const other = field === 'from' ? draft.to : draft.from;
  const limits = limitsFrom(field, other);
  const own = draft[field];
  if (own) return { value: own, ...limits };

  if (other && !allowedByOther(field, today, other)) return { value: other, ...limits };

  return { value: today, ...limits };
}

export function setBound(draft: DateBounds, field: BoundField, date: CalendarDate): DateBounds {
  return { ...draft, [field]: date };
}

export function clearBound(draft: DateBounds, field: BoundField): DateBounds {
  return { ...draft, [field]: null };
}
