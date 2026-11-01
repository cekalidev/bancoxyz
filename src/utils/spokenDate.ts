import type { CalendarDate } from './date';

const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

export function spokenDate({ year, month, day }: CalendarDate): string {
  return `${day} de ${MONTH_NAMES[month - 1]} de ${year}`;
}
