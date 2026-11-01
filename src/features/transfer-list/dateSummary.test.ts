import { dateChipLabel, dateChipText } from './dateSummary';
import type { DateBounds } from './types';

const DASH = '–';
const JUNE_FIRST = { year: 2024, month: 6, day: 1 };
const JUNE_THIRTIETH = { year: 2024, month: 6, day: 30 };

type Row = { bounds: DateBounds; chip: string; label: string };

const ROWS: Row[] = [
  {
    bounds: { from: null, to: null },
    chip: 'Fecha',
    label: 'Filtro de fecha: sin aplicar',
  },
  {
    bounds: { from: JUNE_FIRST, to: JUNE_THIRTIETH },
    chip: `01/06/2024${DASH}30/06/2024`,
    label: 'Filtro de fecha: del 1 de junio de 2024 al 30 de junio de 2024',
  },
  {
    bounds: { from: JUNE_FIRST, to: null },
    chip: 'Desde 01/06/2024',
    label: 'Filtro de fecha: desde el 1 de junio de 2024',
  },
  {
    bounds: { from: null, to: JUNE_THIRTIETH },
    chip: 'Hasta 30/06/2024',
    label: 'Filtro de fecha: hasta el 30 de junio de 2024',
  },
];

it.each(ROWS.map(({ bounds, chip, label }) => [bounds, chip, label] as const))(
  'el chip de fecha resume el rango y su etiqueta lo dice hablado',
  (bounds, chip, label) => {
    expect(dateChipText(bounds)).toBe(chip);
    expect(dateChipLabel(bounds)).toBe(label);
  },
);
