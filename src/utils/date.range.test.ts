import {
  addOneYear,
  calendarDateFromLocal,
  compareDates,
  formatDisplayDate,
  isBefore,
  isSameDate,
  toLocalDate,
  todayLocal,
  type CalendarDate,
} from './date';

function fromDisplay(text: string): CalendarDate {
  const [day, month, year] = text.split('/').map(Number);
  return { year, month, day };
}

describe('suma de un año a una fecha de calendario', () => {
  it.each([
    ['31/10/2026', '31/10/2027'],
    ['29/02/2028', '28/02/2029'],
    ['28/02/2027', '28/02/2028'],
    ['01/03/2028', '01/03/2029'],
  ])('suma un año y desde un 29 de febrero da el 28 de febrero: «%s» da «%s»', (from, expected) => {
    expect(formatDisplayDate(addOneYear(fromDisplay(from)))).toBe(expected);
  });
});

describe('comparación de fechas de calendario', () => {
  it.each([
    ['31/10/2026', '31/10/2026', 0],
    ['30/10/2026', '31/10/2026', -1],
    ['31/10/2026', '30/10/2026', 1],
    ['31/10/2026', '01/11/2026', -1],
    ['01/11/2026', '31/10/2026', 1],
    ['31/12/2026', '01/01/2027', -1],
    ['01/01/2027', '31/12/2026', 1],
    ['31/10/2027', '01/11/2026', 1],
  ])('compara días locales: «%s» frente a «%s» da %i', (a, b, expected) => {
    expect(compareDates(fromDisplay(a), fromDisplay(b))).toBe(expected);
  });

  it('compara días locales sin tener en cuenta la hora', () => {
    const startOfDay = calendarDateFromLocal(new Date(2026, 9, 31, 0, 0));
    const endOfDay = calendarDateFromLocal(new Date(2026, 9, 31, 23, 59));

    expect(compareDates(startOfDay, endOfDay)).toBe(0);
  });
});

describe('orden e igualdad de fechas de calendario', () => {
  it.each([
    ['30/10/2026', '31/10/2026', true],
    ['31/10/2026', '31/10/2026', false],
    ['01/11/2026', '31/10/2026', false],
    ['31/12/2026', '01/01/2027', true],
  ])('isBefore es verdadero solo si el primer día es anterior: «%s» frente a «%s»', (a, b, expected) => {
    expect(isBefore(fromDisplay(a), fromDisplay(b))).toBe(expected);
  });

  it.each([
    ['31/10/2026', '31/10/2026', true],
    ['31/10/2026', '01/11/2026', false],
    ['31/10/2026', '30/11/2026', false],
    ['31/10/2026', '31/10/2027', false],
  ])('isSameDate es verdadero solo si día, mes y año coinciden: «%s» frente a «%s»', (a, b, expected) => {
    expect(isSameDate(fromDisplay(a), fromDisplay(b))).toBe(expected);
  });
});

describe('conversión entre el día local y Date', () => {
  it.each([
    { when: 'a mediodía', now: new Date(2026, 9, 31, 12, 0), expected: '31/10/2026' },
    { when: 'a las 23:59 locales', now: new Date(2026, 9, 31, 23, 59), expected: '31/10/2026' },
    { when: 'a las 00:01 locales', now: new Date(2026, 10, 1, 0, 1), expected: '01/11/2026' },
    { when: 'cuando en UTC ya es otro día', now: new Date(Date.UTC(2026, 10, 1, 4, 30)), expected: '31/10/2026' },
  ])('convierte entre el día local y Date sin pasar por texto: hoy $when es «$expected»', ({ now, expected }) => {
    expect(formatDisplayDate(todayLocal(now))).toBe(expected);
  });

  it('convierte entre el día local y Date sin pasar por texto: el día queda a medianoche local', () => {
    const local = toLocalDate({ year: 2026, month: 10, day: 31 });

    expect([local.getFullYear(), local.getMonth(), local.getDate()]).toEqual([2026, 9, 31]);
    expect([local.getHours(), local.getMinutes(), local.getSeconds()]).toEqual([0, 0, 0]);
  });

  it.each(['31/10/2026', '29/02/2028', '01/01/2027', '31/12/2026'])(
    'convierte entre el día local y Date sin pasar por texto: ida y vuelta de «%s»',
    (text) => {
      const date = fromDisplay(text);

      expect(calendarDateFromLocal(toLocalDate(date))).toEqual(date);
    },
  );
});
