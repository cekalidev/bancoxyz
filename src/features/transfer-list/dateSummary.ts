import { formatDisplayDate } from '@/utils/date';
import { spokenDate } from '@/utils/spokenDate';

import type { DateBounds } from './types';

const EN_DASH = '–';
const UNFILTERED_CHIP = 'Fecha';
const UNFILTERED_LABEL = 'Filtro de fecha: sin aplicar';

export function dateChipText({ from, to }: DateBounds): string {
  if (from !== null && to !== null) {
    return `${formatDisplayDate(from)}${EN_DASH}${formatDisplayDate(to)}`;
  }
  if (from !== null) return `Desde ${formatDisplayDate(from)}`;
  if (to !== null) return `Hasta ${formatDisplayDate(to)}`;

  return UNFILTERED_CHIP;
}

function labelWording({ from, to }: DateBounds): string | null {
  if (from !== null && to !== null) return `del ${spokenDate(from)} al ${spokenDate(to)}`;
  if (from !== null) return `desde el ${spokenDate(from)}`;
  if (to !== null) return `hasta el ${spokenDate(to)}`;

  return null;
}

export function dateChipLabel(bounds: DateBounds): string {
  const wording = labelWording(bounds);

  return wording === null ? UNFILTERED_LABEL : `Filtro de fecha: ${wording}`;
}
