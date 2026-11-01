import { applyAmountInput, centsToAmount, formatCents, truncateToCents } from './amountInput';

describe('formato del importe en centavos', () => {
  it.each([
    [1, '0,01'],
    [125000, '1.250,00'],
    [999999999999, '9.999.999.999,99'],
  ])('formatea centavos con el formato pt-BR: %s da «%s»', (cents, expected) => {
    expect(formatCents(cents)).toBe(expected);
  });
});

describe('escritura del importe dígito a dígito', () => {
  function typeDigits(digits: string): string {
    return [...digits].reduce((text, digit) => applyAmountInput(text, text + digit).text, '');
  }

  it.each([
    ['125000', '1.250,00'],
    ['1', '0,01'],
    ['12', '0,12'],
  ])('cada dígito entra por la derecha con dos decimales: «%s» da «%s»', (digits, expected) => {
    expect(typeDigits(digits)).toBe(expected);
  });

  it.each([
    ['0', '0,00'],
    ['00', '0,00'],
    ['001', '0,01'],
  ])('los ceros a la izquierda no cambian nada: «%s» da «%s»', (digits, expected) => {
    expect(typeDigits(digits)).toBe(expected);
  });
});

describe('borrado del importe', () => {
  it.each([
    ['1.250,00', '125,00', 12500],
    ['0,01', '', null],
    ['0,00', '', null],
  ])(
    'borrar quita el último dígito y deja vacío si queda cero: «%s» da «%s»',
    (previousText, expectedText, expectedCents) => {
      const afterBackspace = previousText.slice(0, -1);

      expect(applyAmountInput(previousText, afterBackspace)).toEqual({
        text: expectedText,
        cents: expectedCents,
      });
    },
  );
});

describe('caracteres que no son dígitos', () => {
  it.each(['a', 'X', '-', '+', ' ', '.', ',', '$'])(
    'ignora lo que no es dígito, también al pegar: escribir «%s» no cambia el campo',
    (character) => {
      const previousText = '1.250,00';

      expect(applyAmountInput(previousText, previousText + character)).toEqual({
        text: previousText,
        cents: 125000,
      });
    },
  );

  it.each(['abc', '- +', '  '])(
    'ignora lo que no es dígito, también al pegar: pegar «%s» en el campo vacío lo deja vacío',
    (pasted) => {
      expect(applyAmountInput('', pasted)).toEqual({ text: '', cents: null });
    },
  );

  it('ignora lo que no es dígito, también al pegar: pegar «1.250,00» en el campo vacío da «1.250,00»', () => {
    expect(applyAmountInput('', '1.250,00')).toEqual({ text: '1.250,00', cents: 125000 });
  });
});

describe('límite de doce dígitos significativos', () => {
  const maximum = { text: '9.999.999.999,99', cents: 999999999999 };

  it.each(['0', '5', '9'])(
    'ignora el decimotercer dígito: escribir «%s» deja el campo igual',
    (digit) => {
      expect(applyAmountInput(maximum.text, maximum.text + digit)).toEqual(maximum);
    },
  );

  it('ignora el decimotercer dígito: el duodécimo dígito sí entra', () => {
    expect(applyAmountInput('999.999.999,99', '999.999.999,999')).toEqual(maximum);
  });

  it.each([
    ['12345678901234', '1.234.567.890,12', 123456789012],
    ['00123456789012345', '1.234.567.890,12', 123456789012],
    ['000999999999999', maximum.text, maximum.cents],
  ])(
    'al pegar conserva los doce primeros dígitos significativos: pegar «%s» da «%s»',
    (pasted, expectedText, expectedCents) => {
      expect(applyAmountInput('', pasted)).toEqual({ text: expectedText, cents: expectedCents });
    },
  );
});

describe('tope del saldo en centavos', () => {
  it.each([
    [1800, 180000],
    [1500.505, 150050],
    [0, 0],
    [-150, -15000],
    [0.29, 29],
  ])('trunca el saldo hacia abajo a centavos: «%s» da «%s»', (balance, expectedCents) => {
    expect(truncateToCents(balance)).toBe(expectedCents);
  });
});

describe('importe enviado a la API', () => {
  it.each([
    [30, 0.3, '0.3'],
    [150050, 1500.5, '1500.5'],
    [1, 0.01, '0.01'],
    [125000, 1250, '1250'],
  ])(
    'convierte centavos a unidades exactas: «%s» da «%s»',
    (cents, expectedAmount, expectedJson) => {
      const amount = centsToAmount(cents);

      expect(amount).toBe(expectedAmount);
      expect(JSON.stringify(amount)).toBe(expectedJson);
    },
  );
});
