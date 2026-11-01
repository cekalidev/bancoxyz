import type { CalendarDate } from '@/utils/date';

import { resultTexts } from './resultText';
import type { FinishedOutcome, TransferAttempt } from './types';

const TODAY: CalendarDate = { year: 2026, month: 10, day: 31 };
const NEXT_MONTH: CalendarDate = { year: 2026, month: 11, day: 15 };
const MONEY = 'US$ 1.250,00';

function attemptOf(outcome: FinishedOutcome, date: CalendarDate): TransferAttempt {
  return {
    draft: { cents: 125000, currency: 'USD', document: '12345678900', date },
    outcome,
    finishedAt: 0,
  };
}

describe('textos del resultado inmediato', () => {
  it('el resultado inmediato dice a quién se envió y la fecha', () => {
    expect(resultTexts(attemptOf('immediate', TODAY))).toStrictEqual({
      tone: 'success',
      title: 'Transferencia realizada',
      lines: [
        {
          text: `Enviaste ${MONEY} al CPF 123.456.789-00.`,
          spoken: 'Enviaste 1.250,00 dólares al CPF 123.456.789-00.',
        },
        { text: 'Fecha: 31/10/2026' },
      ],
    });
  });
});

describe('textos del resultado programado', () => {
  it('el resultado programado dice cuándo se enviará', () => {
    expect(resultTexts(attemptOf('scheduled', NEXT_MONTH))).toStrictEqual({
      tone: 'success',
      title: 'Transferencia programada',
      lines: [
        {
          text: `Se enviarán ${MONEY} al CPF 123.456.789-00 el 15/11/2026.`,
          spoken: 'Se enviarán 1.250,00 dólares al CPF 123.456.789-00 el 15/11/2026.',
        },
      ],
    });
  });
});

describe('textos del resultado incierto', () => {
  it('el resultado incierto lista los datos exactos del intento', () => {
    expect(resultTexts(attemptOf('uncertain', TODAY))).toStrictEqual({
      tone: 'warning',
      title: 'No pudimos confirmar si la transferencia se realizó',
      lines: [
        {
          text: 'Puede que se haya hecho. Antes de volver a enviarla, compruébala con estos datos:',
        },
        { text: `Valor: ${MONEY}`, spoken: 'Valor: 1.250,00 dólares', kind: 'label' },
        { text: 'Destinatario: CPF 123.456.789-00', kind: 'label' },
        { text: 'Fecha: 31/10/2026', kind: 'label' },
      ],
    });
  });
});
