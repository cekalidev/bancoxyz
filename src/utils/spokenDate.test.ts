import { spokenDate } from './spokenDate';

it.each([
  [{ year: 2027, month: 1, day: 5 }, '5 de enero de 2027'],
  [{ year: 2027, month: 2, day: 28 }, '28 de febrero de 2027'],
  [{ year: 2028, month: 3, day: 1 }, '1 de marzo de 2028'],
  [{ year: 2027, month: 4, day: 9 }, '9 de abril de 2027'],
  [{ year: 2027, month: 5, day: 15 }, '15 de mayo de 2027'],
  [{ year: 2027, month: 6, day: 30 }, '30 de junio de 2027'],
  [{ year: 2027, month: 7, day: 4 }, '4 de julio de 2027'],
  [{ year: 2027, month: 8, day: 20 }, '20 de agosto de 2027'],
  [{ year: 2027, month: 9, day: 10 }, '10 de septiembre de 2027'],
  [{ year: 2026, month: 10, day: 31 }, '31 de octubre de 2026'],
  [{ year: 2026, month: 11, day: 15 }, '15 de noviembre de 2026'],
  [{ year: 2026, month: 12, day: 25 }, '25 de diciembre de 2026'],
])('dice la fecha con el mes en español', (date, expected) => {
  expect(spokenDate(date)).toBe(expected);
});
