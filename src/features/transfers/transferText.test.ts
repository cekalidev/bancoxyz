import type { CalendarDate } from '@/utils/date';

import {
  confirmDateText,
  documentLabel,
  duplicateMessage,
  formDateSpoken,
  formDateText,
  REJECTED_MESSAGE,
  spokenSummary,
} from './transferText';
import type { TransferDraft } from './types';

const TODAY: CalendarDate = { year: 2026, month: 10, day: 31 };
const NEXT_MONTH: CalendarDate = { year: 2026, month: 11, day: 15 };

describe('texto del destinatario y de la fecha en la confirmación', () => {
  it.each([
    ['12345678900', 'CPF 123.456.789-00'],
    ['12345678000190', 'CNPJ 12.345.678/0001-90'],
    ['1234567890', '123.456.789-0'],
  ])('nombra el documento con su tipo y su máscara: «%s» da «%s»', (digits, expected) => {
    expect(documentLabel(digits)).toBe(expected);
  });

  it.each<[string, string, CalendarDate]>([
    ['hoy 31/10/2026', 'Hoy, 31/10/2026', TODAY],
    ['fecha futura 15/11/2026', 'Programada para el 15/11/2026', NEXT_MONTH],
  ])(
    'la fecha de la confirmación dice Hoy o Programada para el: «%s» da «%s»',
    (_description, expected, date) => {
      expect(confirmDateText(date, TODAY)).toBe(expected);
    },
  );
});

describe('texto de la fecha en el formulario', () => {
  it.each([
    {
      description: 'hoy 31/10/2026',
      date: TODAY,
      text: 'Hoy, 31/10/2026',
      spoken: 'Fecha de la transferencia: hoy, 31 de octubre de 2026',
    },
    {
      description: 'fecha futura 15/11/2026',
      date: NEXT_MONTH,
      text: '15/11/2026',
      spoken: 'Fecha de la transferencia: 15 de noviembre de 2026',
    },
  ])(
    'la fecha del formulario dice Hoy o la fecha y se habla completa: «$description»',
    ({ date, text, spoken }) => {
      expect(formDateText(date, TODAY)).toBe(text);
      expect(formDateSpoken(date, TODAY)).toBe(spoken);
    },
  );
});

describe('resumen hablado de la confirmación', () => {
  const draft: TransferDraft = {
    cents: 125000,
    currency: 'USD',
    document: '12345678900',
    date: TODAY,
  };

  it.each<[string, CalendarDate, string]>([
    [
      'hoy 31/10/2026',
      TODAY,
      'Vas a transferir 1.250,00 dólares al CPF 123.456.789-00, hoy, 31 de octubre de 2026',
    ],
    [
      'fecha futura 15/11/2026',
      NEXT_MONTH,
      'Vas a transferir 1.250,00 dólares al CPF 123.456.789-00, programada para el 15 de noviembre de 2026',
    ],
  ])(
    'el resumen hablado dice importe, destinatario y fecha de hoy o programada: «%s»',
    (_description, date, expected) => {
      expect(spokenSummary({ ...draft, date }, TODAY)).toBe(expected);
    },
  );
});

describe('avisos fijos de la confirmación', () => {
  it('los avisos fijos son los textos propios de la spec', () => {
    expect(REJECTED_MESSAGE).toBe(
      'No pudimos hacer la transferencia. Revisa los datos e inténtalo de nuevo.',
    );
    expect(duplicateMessage(3)).toBe(
      'Ya enviaste una transferencia igual hace 3 min. ¿Quieres enviar otra?',
    );
  });
});
