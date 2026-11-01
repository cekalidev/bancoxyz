const ACCENTED_LETTERS: readonly (readonly [string, string])[] = [
  ['a', 'áàâãäåÁÀÂÃÄÅ'],
  ['e', 'éèêëÉÈÊË'],
  ['i', 'íìîïÍÌÎÏ'],
  ['o', 'óòôõöÓÒÔÕÖ'],
  ['u', 'úùûüÚÙÛÜ'],
  ['y', 'ýÿÝŸ'],
  ['n', 'ñÑ'],
  ['c', 'çÇ'],
];

const PLAIN_LETTER_OF = new Map<string, string>(
  ACCENTED_LETTERS.flatMap(([plain, accented]) =>
    Array.from(accented, (letter): [string, string] => [letter, plain]),
  ),
);

export function foldForSearch(text: string): string {
  return Array.from(text, (letter) => PLAIN_LETTER_OF.get(letter) ?? letter)
    .join('')
    .toLowerCase();
}
