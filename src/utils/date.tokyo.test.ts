/** @jest-environment-options {"timezone":"Asia/Tokyo"} */
import { formatDisplayDate, parseApiDate } from './date';

describe('fechas de calendario en una zona horaria adelantada a UTC', () => {
  it('se ejecuta con la zona horaria de Tokio', () => {
    expect(new Date(2026, 9, 30).getTimezoneOffset()).toBe(-540);
  });

  it('muestra la fecha como DD/MM/AAAA sin cambiar de día', () => {
    const date = parseApiDate('2026-10-30');

    expect(date).toEqual({ year: 2026, month: 10, day: 30 });
    expect(formatDisplayDate(date!)).toBe('30/10/2026');
  });
});
