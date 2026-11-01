import type { CalendarDate } from '@/utils/date';

import { clearBound, pickerRequestFor, setBound } from './datePickerBounds';
import type { BoundField, DateBounds } from './types';

const date = (day: number, month: number, year: number): CalendarDate => ({ year, month, day });

const TODAY = date(31, 10, 2026);

describe('pickerRequestFor', () => {
  it.each<{
    field: BoundField;
    from: CalendarDate | null;
    to: CalendarDate | null;
    expected: CalendarDate;
  }>([
    { field: 'from', from: null, to: date(30, 6, 2024), expected: date(30, 6, 2024) },
    { field: 'to', from: date(1, 12, 2026), to: null, expected: date(1, 12, 2026) },
    { field: 'from', from: null, to: date(15, 11, 2026), expected: TODAY },
    { field: 'from', from: date(1, 6, 2024), to: null, expected: date(1, 6, 2024) },
    { field: 'from', from: null, to: null, expected: TODAY },
    { field: 'to', from: null, to: null, expected: TODAY },
    { field: 'from', from: null, to: TODAY, expected: TODAY },
    { field: 'from', from: null, to: date(30, 10, 2026), expected: date(30, 10, 2026) },
    { field: 'to', from: TODAY, to: null, expected: TODAY },
    { field: 'to', from: date(1, 11, 2026), to: null, expected: date(1, 11, 2026) },
    { field: 'to', from: date(1, 6, 2024), to: null, expected: TODAY },
    { field: 'from', from: date(1, 6, 2024), to: date(30, 6, 2024), expected: date(1, 6, 2024) },
    { field: 'to', from: date(1, 6, 2024), to: date(30, 6, 2024), expected: date(30, 6, 2024) },
    { field: 'from', from: date(1, 12, 2026), to: date(31, 12, 2026), expected: date(1, 12, 2026) },
  ])('el selector abre en la fecha del campo, en hoy o en la del otro campo', (row) => {
    const request = pickerRequestFor(row.field, { from: row.from, to: row.to }, TODAY);

    expect(request.value).toEqual(row.expected);
  });
});

type LimitRow = {
  field: BoundField;
  from: CalendarDate | null;
  to: CalendarDate | null;
  expected: { min?: CalendarDate; max?: CalendarDate };
};

const LIMIT_ROWS: LimitRow[] = [
  { field: 'to', from: date(1, 6, 2024), to: null, expected: { min: date(1, 6, 2024) } },
  { field: 'from', from: null, to: date(30, 6, 2024), expected: { max: date(30, 6, 2024) } },
  {
    field: 'to',
    from: date(1, 6, 2024),
    to: date(30, 6, 2024),
    expected: { min: date(1, 6, 2024) },
  },
  {
    field: 'from',
    from: date(1, 6, 2024),
    to: date(30, 6, 2024),
    expected: { max: date(30, 6, 2024) },
  },
  { field: 'to', from: date(1, 12, 2026), to: null, expected: { min: date(1, 12, 2026) } },
  { field: 'from', from: null, to: date(15, 11, 2026), expected: { max: date(15, 11, 2026) } },
  { field: 'to', from: TODAY, to: null, expected: { min: TODAY } },
  { field: 'from', from: null, to: TODAY, expected: { max: TODAY } },
  { field: 'to', from: date(31, 12, 2025), to: null, expected: { min: date(31, 12, 2025) } },
];

const WITHOUT_OTHER_ROWS: Omit<LimitRow, 'expected'>[] = [
  { field: 'from', from: null, to: null },
  { field: 'to', from: null, to: null },
  { field: 'from', from: date(1, 6, 2024), to: null },
  { field: 'to', from: null, to: date(30, 6, 2024) },
  { field: 'from', from: date(1, 12, 2026), to: null },
  { field: 'to', from: null, to: TODAY },
];

describe('límites del selector de fecha', () => {
  it.each(LIMIT_ROWS)(
    'Hasta no admite días antes de Desde y Desde no admite días después de Hasta',
    (row) => {
      const request = pickerRequestFor(row.field, { from: row.from, to: row.to }, TODAY);

      expect({ min: request.min, max: request.max }).toEqual(row.expected);
    },
  );

  it.each(WITHOUT_OTHER_ROWS)('sin otro campo no hay mínimo ni máximo', (row) => {
    const request = pickerRequestFor(row.field, { from: row.from, to: row.to }, TODAY);

    expect(request.min).toBeUndefined();
    expect(request.max).toBeUndefined();
  });
});

type ClearRow = { field: BoundField; draft: DateBounds; expected: DateBounds };

const JUNE_FIRST = date(1, 6, 2024);
const JUNE_LAST = date(30, 6, 2024);

const CLEAR_ROWS: ClearRow[] = [
  {
    field: 'from',
    draft: { from: JUNE_FIRST, to: JUNE_LAST },
    expected: { from: null, to: JUNE_LAST },
  },
  {
    field: 'to',
    draft: { from: JUNE_FIRST, to: JUNE_LAST },
    expected: { from: JUNE_FIRST, to: null },
  },
  { field: 'from', draft: { from: JUNE_FIRST, to: null }, expected: { from: null, to: null } },
  { field: 'to', draft: { from: null, to: JUNE_LAST }, expected: { from: null, to: null } },
  { field: 'from', draft: { from: null, to: JUNE_LAST }, expected: { from: null, to: JUNE_LAST } },
  { field: 'to', draft: { from: JUNE_FIRST, to: null }, expected: { from: JUNE_FIRST, to: null } },
  { field: 'from', draft: { from: null, to: null }, expected: { from: null, to: null } },
  { field: 'to', draft: { from: null, to: null }, expected: { from: null, to: null } },
];

type SetRow = ClearRow & { picked: CalendarDate };

const SET_ROWS: SetRow[] = [
  {
    field: 'from',
    draft: { from: null, to: null },
    picked: JUNE_FIRST,
    expected: { from: JUNE_FIRST, to: null },
  },
  {
    field: 'to',
    draft: { from: null, to: null },
    picked: JUNE_LAST,
    expected: { from: null, to: JUNE_LAST },
  },
  {
    field: 'from',
    draft: { from: date(1, 1, 2024), to: JUNE_LAST },
    picked: JUNE_FIRST,
    expected: { from: JUNE_FIRST, to: JUNE_LAST },
  },
  {
    field: 'to',
    draft: { from: JUNE_FIRST, to: date(31, 12, 2026) },
    picked: JUNE_LAST,
    expected: { from: JUNE_FIRST, to: JUNE_LAST },
  },
  {
    field: 'from',
    draft: { from: null, to: JUNE_LAST },
    picked: TODAY,
    expected: { from: TODAY, to: JUNE_LAST },
  },
  {
    field: 'to',
    draft: { from: JUNE_FIRST, to: null },
    picked: TODAY,
    expected: { from: JUNE_FIRST, to: TODAY },
  },
];

describe('edición del borrador de fechas', () => {
  it.each(CLEAR_ROWS)('borrar un extremo lo deja sin límite y no toca el otro', (row) => {
    const before = { ...row.draft };

    const result = clearBound(row.draft, row.field);

    expect(result).toEqual(row.expected);
    expect(row.draft).toEqual(before);
  });

  it.each(SET_ROWS)('elegir una fecha la pone en su campo y no toca el otro', (row) => {
    const before = { ...row.draft };

    const result = setBound(row.draft, row.field, row.picked);

    expect(result).toEqual(row.expected);
    expect(row.draft).toEqual(before);
  });
});
