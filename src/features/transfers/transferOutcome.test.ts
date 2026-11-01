import { ApiError, ERROR_MESSAGES } from '@/services/api/errors';
import type { CalendarDate } from '@/utils/date';
import { documentDigitsFrom } from '@/utils/document';

import { toNewTransfer, transferOutcome } from './transferOutcome';
import type { TransferOutcome } from './types';

const TODAY: CalendarDate = { year: 2026, month: 10, day: 31 };

describe('resultado de un envío sin error', () => {
  it.each<[string, TransferOutcome, CalendarDate]>([
    ['hoy 31/10/2026', 'immediate', { year: 2026, month: 10, day: 31 }],
    ['mañana 01/11/2026', 'scheduled', { year: 2026, month: 11, day: 1 }],
    ['dentro de un mes 30/11/2026', 'scheduled', { year: 2026, month: 11, day: 30 }],
  ])(
    'un éxito con la fecha de hoy es inmediata y con fecha futura programada: «%s» da «%s»',
    (_description, expected, date) => {
      expect(transferOutcome(null, date, TODAY)).toBe(expected);
    },
  );
});

describe('resultado de un envío con error del servidor', () => {
  const nextMonth: CalendarDate = { year: 2026, month: 11, day: 30 };

  it('un 400 es una transferencia rechazada', () => {
    expect(transferOutcome(new ApiError('badRequest'), TODAY, TODAY)).toBe('rejected');
    expect(transferOutcome(new ApiError('badRequest'), nextMonth, TODAY)).toBe('rejected');
  });

  it('un 401 es una sesión caducada', () => {
    expect(transferOutcome(new ApiError('unauthorized'), TODAY, TODAY)).toBe('expired');
    expect(transferOutcome(new ApiError('unauthorized'), nextMonth, TODAY)).toBe('expired');
  });
});

describe('resultado de un envío que no se pudo confirmar', () => {
  it.each<[string, unknown]>([
    ['sin red ni tiempo (network)', new ApiError('network')],
    ['otro código o 200 sin éxito (unknown)', new ApiError('unknown')],
    ['credenciales inválidas (invalidCredentials)', new ApiError('invalidCredentials')],
    ['error no tipado', new Error('fallo inesperado')],
    ['valor lanzado que no es un error', 'fallo inesperado'],
    ['network con el mensaje de un 400', Object.assign(new ApiError('network'), { message: ERROR_MESSAGES.badRequest })],
    ['unknown con el mensaje de un 401', Object.assign(new ApiError('unknown'), { message: ERROR_MESSAGES.unauthorized })],
  ])(
    'sin red, tiempo agotado, cualquier otro código o un 200 sin éxito es incierto: «%s»',
    (_description, error) => {
      expect(transferOutcome(error, TODAY, TODAY)).toBe('uncertain');
    },
  );
});

describe('petición de transferencia', () => {
  it.each([
    ['1.250,00 USD', { cents: 125000, currency: 'USD' }, 1250],
    ['0,30 USD', { cents: 30, currency: 'USD' }, 0.3],
    ['1.500,50 BRL', { cents: 150050, currency: 'BRL' }, 1500.5],
    ['0,01 BRL', { cents: 1, currency: 'BRL' }, 0.01],
  ])(
    'prepara la transferencia con unidades, documento en dígitos y la fecha del borrador: «%s»',
    (_description, money, amount) => {
      const date: CalendarDate = { year: 2026, month: 11, day: 15 };
      const draft = { ...money, document: documentDigitsFrom('123.456.789-00'), date };

      expect(toNewTransfer(draft)).toEqual({
        amount,
        currency: money.currency,
        payeeDocument: '12345678900',
        date: { year: 2026, month: 11, day: 15 },
      });
    },
  );
});
