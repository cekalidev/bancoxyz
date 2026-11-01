import { documentDigitsFrom, documentKind, formatDocument } from './document';

function fieldTextAfter(nextText: string): string {
  return formatDocument(documentDigitsFrom(nextText));
}

describe('máscara del documento', () => {
  it.each([
    ['', ''],
    ['123', '123'],
    ['1234', '123.4'],
    ['123456', '123.456'],
    ['1234567', '123.456.7'],
    ['123456789', '123.456.789'],
    ['1234567890', '123.456.789-0'],
    ['12345678900', '123.456.789-00'],
    ['123456789012', '12.345.678/9012'],
    ['1234567890123', '12.345.678/9012-3'],
    ['12345678000190', '12.345.678/0001-90'],
  ])(
    'aplica la máscara de CPF hasta once dígitos y la de CNPJ de doce a catorce: «%s» da «%s»',
    (digits, expected) => {
      expect(formatDocument(digits)).toBe(expected);
    },
  );

  it('al borrar el duodécimo vuelve a la máscara de CPF', () => {
    const afterBackspace = '12.345.678/9012'.slice(0, -1);

    expect(fieldTextAfter(afterBackspace)).toBe('123.456.789-01');
  });
});

describe('texto que no son dígitos en el documento', () => {
  it.each([
    ['abc', ''],
    ['1a2b3', '123'],
    ['1 2 3', '123'],
    ['--..//', ''],
    ['123.4x', '123.4'],
    ['123.', '123'],
  ])('ignora lo que no es dígito: «%s» da «%s»', (nextText, expected) => {
    expect(fieldTextAfter(nextText)).toBe(expected);
  });

  it.each([
    ['123.456.789-00', '123.456.789-00'],
    ['12.345.678/0001-90', '12.345.678/0001-90'],
    ['123 456 789/00', '123.456.789-00'],
  ])(
    'al pegar con separadores conserva los dígitos con su máscara: «%s» da «%s»',
    (pasted, expected) => {
      expect(fieldTextAfter(pasted)).toBe(expected);
    },
  );
});

describe('límite de catorce dígitos del documento', () => {
  const complete = '12.345.678/0001-90';

  it.each(['0', '5', '9'])(
    'ignora el decimoquinto dígito y trunca un pegado a catorce: escribir «%s» deja el campo igual',
    (digit) => {
      expect(fieldTextAfter(complete + digit)).toBe(complete);
    },
  );

  it.each([
    ['12.345.678/0001-9099', complete],
    ['1234567800019099999', complete],
  ])(
    'ignora el decimoquinto dígito y trunca un pegado a catorce: pegar «%s» da «%s»',
    (pasted, expected) => {
      expect(documentDigitsFrom(pasted)).toHaveLength(14);
      expect(fieldTextAfter(pasted)).toBe(expected);
    },
  );
});

describe('tipo de documento', () => {
  it.each([
    [0, null],
    [10, null],
    [11, 'CPF'],
    [12, null],
    [13, null],
    [14, 'CNPJ'],
    [15, null],
  ])('reconoce CPF de 11 dígitos, CNPJ de 14 y nada más: con %s dígitos da «%s»', (count, expected) => {
    expect(documentKind('7'.repeat(count))).toBe(expected);
  });
});
