export type CalendarDate = { year: number; month: number; day: number };

const API_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAYS_PER_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  return month === 2 && isLeapYear(year) ? 29 : DAYS_PER_MONTH[month - 1];
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

export function parseApiDate(text: string): CalendarDate | null {
  const match = API_DATE_PATTERN.exec(text);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

export function formatDisplayDate(date: CalendarDate): string {
  return `${pad(date.day)}/${pad(date.month)}/${pad(date.year, 4)}`;
}

export function toApiDate(date: CalendarDate): string {
  return `${pad(date.year, 4)}-${pad(date.month)}-${pad(date.day)}`;
}

export function calendarDateFromLocal(date: Date): CalendarDate {
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

function sign(value: number): -1 | 0 | 1 {
  if (value < 0) return -1;
  return value > 0 ? 1 : 0;
}

function dayNumber({ year, month, day }: CalendarDate): number {
  return year * 10000 + month * 100 + day;
}

export function compareDates(a: CalendarDate, b: CalendarDate): -1 | 0 | 1 {
  return sign(dayNumber(a) - dayNumber(b));
}

export function isBefore(a: CalendarDate, b: CalendarDate): boolean {
  return compareDates(a, b) === -1;
}

export function isSameDate(a: CalendarDate, b: CalendarDate): boolean {
  return compareDates(a, b) === 0;
}

export function addOneYear({ year, month, day }: CalendarDate): CalendarDate {
  const nextYear = year + 1;
  return { year: nextYear, month, day: Math.min(day, daysInMonth(nextYear, month)) };
}

export function todayLocal(now = new Date()): CalendarDate {
  return calendarDateFromLocal(now);
}

export function toLocalDate({ year, month, day }: CalendarDate): Date {
  return new Date(year, month - 1, day);
}
