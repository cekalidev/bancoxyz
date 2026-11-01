import type { CalendarDate } from '@/utils/date';

const RONALDO = 'Ronaldo de Assis Moreira';
const MESSI = 'Lionel Andres Messi';
const VALVERDE = 'Federico Valverde';

const day = (year: number, month: number, dayOfMonth: number): CalendarDate => ({
  year,
  month,
  day: dayOfMonth,
});

const JUN_12 = day(2024, 6, 12);
const AUG_25 = day(2024, 8, 25);

export type DateRangeCase = {
  partition: string;
  from: CalendarDate | null;
  to: CalendarDate | null;
  rows: string[];
};

// Rangos de fecha contra las 3 transferencias reales (Ronaldo el 25/08/2024; Messi y Valverde el
// 12/06/2024), con las filas que deben quedar en el orden del listado; null es «Sin límite».
export const DATE_RANGE_CASES: DateRangeCase[] = [
  { partition: 'solo mínimo, en el límite', from: JUN_12, to: null, rows: [RONALDO, MESSI, VALVERDE] },
  { partition: 'solo mínimo, límite + 1 día', from: day(2024, 6, 13), to: null, rows: [RONALDO] },
  { partition: 'solo máximo, en el límite', from: null, to: JUN_12, rows: [MESSI, VALVERDE] },
  { partition: 'solo máximo, límite − 1 día', from: null, to: day(2024, 6, 11), rows: [] },
  { partition: 'fecha exacta de junio', from: JUN_12, to: JUN_12, rows: [MESSI, VALVERDE] },
  { partition: 'fecha exacta de agosto', from: AUG_25, to: AUG_25, rows: [RONALDO] },
  { partition: 'rango del mes', from: day(2024, 6, 1), to: day(2024, 6, 30), rows: [MESSI, VALVERDE] },
  { partition: 'posterior a todo', from: day(2024, 8, 26), to: null, rows: [] },
];
