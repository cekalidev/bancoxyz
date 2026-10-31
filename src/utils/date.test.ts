import { calendarDateFromLocal, formatDisplayDate, parseApiDate, toApiDate } from './date';

describe('fechas de calendario', () => {
  it('muestra la fecha como DD/MM/AAAA sin cambiar de día', () => {
    const date = parseApiDate('2026-10-30');

    expect(date).toEqual({ year: 2026, month: 10, day: 30 });
    expect(formatDisplayDate(date!)).toBe('30/10/2026');
  });

  it('convierte el día local a AAAA-MM-DD aunque en UTC ya sea otro día', () => {
    const lateNightInBogota = new Date(Date.UTC(2026, 9, 31, 4, 30));

    expect(lateNightInBogota.getHours()).toBe(23);
    expect(toApiDate(calendarDateFromLocal(lateNightInBogota))).toBe('2026-10-30');
  });

  it.each(['2026-02-30', '30/10/2026', '2026-10-30T00:00:00Z', '', '2026-13-01', '2025-02-29'])(
    'reconoce como no válidas fechas imposibles, con otro formato o con hora: «%s»',
    (text) => {
      expect(parseApiDate(text)).toBeNull();
    },
  );

  it('acepta el 29 de febrero de un año bisiesto', () => {
    const date = parseApiDate('2024-02-29');

    expect(date).toEqual({ year: 2024, month: 2, day: 29 });
    expect(formatDisplayDate(date!)).toBe('29/02/2024');
  });
});
