import { foldForSearch } from './normalizeText';

const ACCENTED_LETTERS = [
  ['á', 'a'],
  ['à', 'a'],
  ['â', 'a'],
  ['ã', 'a'],
  ['ä', 'a'],
  ['å', 'a'],
  ['Á', 'a'],
  ['À', 'a'],
  ['Â', 'a'],
  ['Ã', 'a'],
  ['Ä', 'a'],
  ['Å', 'a'],
  ['é', 'e'],
  ['è', 'e'],
  ['ê', 'e'],
  ['ë', 'e'],
  ['É', 'e'],
  ['È', 'e'],
  ['Ê', 'e'],
  ['Ë', 'e'],
  ['í', 'i'],
  ['ì', 'i'],
  ['î', 'i'],
  ['ï', 'i'],
  ['Í', 'i'],
  ['Ì', 'i'],
  ['Î', 'i'],
  ['Ï', 'i'],
  ['ó', 'o'],
  ['ò', 'o'],
  ['ô', 'o'],
  ['õ', 'o'],
  ['ö', 'o'],
  ['Ó', 'o'],
  ['Ò', 'o'],
  ['Ô', 'o'],
  ['Õ', 'o'],
  ['Ö', 'o'],
  ['ú', 'u'],
  ['ù', 'u'],
  ['û', 'u'],
  ['ü', 'u'],
  ['Ú', 'u'],
  ['Ù', 'u'],
  ['Û', 'u'],
  ['Ü', 'u'],
  ['ý', 'y'],
  ['ÿ', 'y'],
  ['Ý', 'y'],
  ['Ÿ', 'y'],
  ['ñ', 'n'],
  ['Ñ', 'n'],
  ['ç', 'c'],
  ['Ç', 'c'],
];

describe('normalización de texto para buscar', () => {
  it.each(ACCENTED_LETTERS)(
    'quita tildes, diéresis y virgulillas en mayúsculas y minúsculas: «%s» da «%s»',
    (letter, expected) => {
      expect(foldForSearch(letter)).toBe(expected);
    },
  );

  it.each([
    ['', ''],
    ['maria perez', 'maria perez'],
    ['Maria Perez', 'maria perez'],
    ['MARIA PEREZ', 'maria perez'],
    ['abc 123 - x_y, z.', 'abc 123 - x_y, z.'],
    ['ABC 123 - X_Y, Z.', 'abc 123 - x_y, z.'],
    ['   ', '   '],
  ])('deja igual lo que no tiene tilde: «%s» da «%s»', (text, expected) => {
    expect(foldForSearch(text)).toBe(expected);
  });
});
