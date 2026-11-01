import { applyAmountInput, type AmountInput } from '@/utils/amountInput';
import { documentDigitsFrom } from '@/utils/document';

import { findRecentDuplicate, sameTransfer } from './duplicateWarning';
import type { FinishedOutcome, TransferAttempt, TransferDraft } from './types';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const NOW = Date.UTC(2026, 9, 31, 15, 0, 0);

function draftWith(overrides: Partial<TransferDraft> = {}): TransferDraft {
  return {
    cents: 30,
    currency: 'USD',
    document: '12345678900',
    date: { year: 2026, month: 10, day: 31 },
    ...overrides,
  };
}

function attemptFinished(
  draft: TransferDraft,
  elapsedMs: number,
  outcome: FinishedOutcome = 'immediate',
): TransferAttempt {
  return { draft, outcome, finishedAt: NOW - elapsedMs };
}

function centsAfterTyping(steps: string[]): number {
  const start: AmountInput = { text: '', cents: null };
  const end = steps.reduce((state, next) => applyAmountInput(state.text, next), start);

  return end.cents ?? 0;
}

describe('transferencia igual a otra', () => {
  it.each([
    ['documento pegado como 123.456.789-00', true, draftWith({ document: documentDigitsFrom('123.456.789-00') })],
    ['valor escrito 3-1, borrado el 1 y escrito 0', true, draftWith({ cents: centsAfterTyping(['3', '0,031', '0,3', '0,030']) })],
    ['otro documento', false, draftWith({ document: '12345678901' })],
    ['otro valor (0,31)', false, draftWith({ cents: 31 })],
    ['otra moneda', false, draftWith({ currency: 'BRL' })],
    ['otra fecha (01/11/2026)', false, draftWith({ date: { year: 2026, month: 11, day: 1 } })],
  ])(
    'igual compara documento en dígitos, centavos, moneda y fecha: «%s», igual: %s',
    (_description, expected, other) => {
      expect(sameTransfer(draftWith(), other)).toBe(expected);
    },
  );
});

describe('búsqueda de un intento igual reciente', () => {
  it.each<FinishedOutcome>(['immediate', 'scheduled', 'uncertain'])(
    'encuentra un intento igual con éxito o incierto de menos de 10 min: «%s»',
    (outcome) => {
      const draft = draftWith();

      expect(findRecentDuplicate([attemptFinished(draft, 2 * MINUTE, outcome)], draft, NOW)).toEqual({
        minutes: 2,
      });
      expect(
        findRecentDuplicate([attemptFinished(draftWith({ cents: 31 }), 2 * MINUTE, outcome)], draft, NOW),
      ).toBeNull();
      expect(findRecentDuplicate([attemptFinished(draft, 11 * MINUTE, outcome)], draft, NOW)).toBeNull();
    },
  );
});

describe('minutos del aviso de transferencia repetida', () => {
  it.each([
    ['0:30', { minutes: 1 }, 30 * SECOND],
    ['1:00', { minutes: 1 }, MINUTE],
    ['3:59', { minutes: 3 }, 3 * MINUTE + 59 * SECOND],
    ['9:59', { minutes: 9 }, 9 * MINUTE + 59 * SECOND],
    ['10:00', null, 10 * MINUTE],
    ['10:01', null, 10 * MINUTE + SECOND],
  ])(
    'calcula los minutos hacia abajo con mínimo uno y deja de avisar a los 10 min: «%s» da «%j»',
    (_elapsed, expected, elapsedMs) => {
      const draft = draftWith();

      expect(findRecentDuplicate([attemptFinished(draft, elapsedMs)], draft, NOW)).toEqual(expected);
    },
  );
});

describe('varios intentos registrados', () => {
  it('con varios intentos avisa por cualquiera igual y usa el más reciente', () => {
    const first = draftWith();
    const second = draftWith({ document: '12345678901', cents: 4500 });
    const attempts = [attemptFinished(first, 3 * MINUTE), attemptFinished(second, MINUTE)];

    expect(findRecentDuplicate(attempts, first, NOW)).toEqual({ minutes: 3 });

    const older = attemptFinished(first, 5 * MINUTE);
    const newer = attemptFinished(draftWith(), 2 * MINUTE, 'uncertain');

    expect(findRecentDuplicate([older, newer], first, NOW)).toEqual({ minutes: 2 });
    expect(findRecentDuplicate([newer, older], first, NOW)).toEqual({ minutes: 2 });
  });
});
