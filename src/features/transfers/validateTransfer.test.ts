import type { CalendarDate } from '@/utils/date';

import { validateAmount, validateDate, validateDocument, validateTransfer } from './validateTransfer';

const EMPTY_AMOUNT = 'Escribe el valor.';
const ZERO_AMOUNT = 'El valor debe ser mayor que 0.';
const OVER_BALANCE = 'El valor supera tu saldo disponible.';
const EMPTY_DOCUMENT = 'Escribe el documento del destinatario.';
const WRONG_LENGTH = 'El documento debe tener 11 dígitos (CPF) o 14 (CNPJ).';
const PAST_DATE = 'La fecha no puede ser anterior a hoy.';
const FAR_DATE = 'Elige una fecha dentro del próximo año.';

function fromDisplay(text: string): CalendarDate {
  const [day, month, year] = text.split('/').map(Number);
  return { year, month, day };
}

describe('validación del valor', () => {
  it.each([
    ['vacío', EMPTY_AMOUNT, null],
    ['0,00', ZERO_AMOUNT, 0],
    ['0,01', undefined, 1],
    ['1.250,00', undefined, 125000],
    ['1.800,00', undefined, 180000],
    ['1.800,01', OVER_BALANCE, 180001],
    ['9.999.999.999,99', OVER_BALANCE, 999999999999],
  ])(
    'valida el valor contra el saldo con el mensaje exacto: «%s» da «%s»',
    (_written, expected, cents) => {
      expect(validateAmount(cents, 180000)).toBe(expected);
    },
  );

  it.each([0, -15000])(
    'con saldo cero o negativo cualquier valor supera el disponible: tope «%s»',
    (capCents) => {
      expect(validateAmount(1, capCents)).toBe(OVER_BALANCE);
    },
  );

  it.each([
    ['1.500,50', undefined, 150050],
    ['1.500,51', OVER_BALANCE, 150051],
  ])(
    'el tope truncado admite 1.500,50 y rechaza 1.500,51: «%s» da «%s»',
    (_written, expected, cents) => {
      expect(validateAmount(cents, 150050)).toBe(expected);
    },
  );
});

describe('validación del documento', () => {
  it.each([
    ['', EMPTY_DOCUMENT],
    ['1234567890', WRONG_LENGTH],
    ['12345678900', undefined],
    ['12019910177', undefined],
    ['123456789012', WRONG_LENGTH],
    ['1234567890123', WRONG_LENGTH],
    ['12345678000190', undefined],
  ])(
    'valida el documento por número de dígitos sin dígito verificador: «%s» da «%s»',
    (digits, expected) => {
      expect(validateDocument(digits)).toBe(expected);
    },
  );
});

describe('validación de la fecha', () => {
  it.each([
    ['31/10/2026', '30/10/2026', PAST_DATE],
    ['31/10/2026', '31/10/2026', undefined],
    ['31/10/2026', '01/11/2026', undefined],
    ['31/10/2026', '31/10/2027', undefined],
    ['31/10/2026', '01/11/2027', FAR_DATE],
    ['29/02/2028', '28/02/2029', undefined],
    ['29/02/2028', '01/03/2029', FAR_DATE],
  ])(
    'valida la fecha entre hoy y hoy más un año: hoy «%s», fecha «%s» da «%s»',
    (today, date, expected) => {
      expect(validateDate(fromDisplay(date), fromDisplay(today))).toBe(expected);
    },
  );
});

describe('validación de la transferencia completa', () => {
  const today = fromDisplay('31/10/2026');
  const limits = { capCents: 180000, today };

  it('muestra juntos los errores de los tres campos', () => {
    const values = { cents: null, document: '123', date: fromDisplay('30/10/2026') };

    expect(validateTransfer(values, limits)).toStrictEqual({
      amount: EMPTY_AMOUNT,
      document: WRONG_LENGTH,
      date: PAST_DATE,
    });
  });

  it('no incluye los campos válidos y devuelve vacío si todo es válido', () => {
    const values = { cents: 125000, document: '12345678900', date: today };

    expect(validateTransfer(values, limits)).toStrictEqual({});
  });

  it.each([
    ['hoy', '31/10/2026'],
    ['programada', '15/11/2026'],
  ])(
    'el tope del saldo aplica también a una fecha futura: fecha %s «%s»',
    (_kind, date) => {
      const values = { cents: 180001, document: '12345678900', date: fromDisplay(date) };

      expect(validateTransfer(values, limits)).toStrictEqual({ amount: OVER_BALANCE });
    },
  );
});
