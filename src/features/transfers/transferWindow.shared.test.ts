import { findRecentDuplicate } from './duplicateWarning';
import { finishAttempt, resetTransfers } from './transferActions';
import { useTransferStore } from './transferStore';
import type { TransferAttempt, TransferDraft } from './types';

// Solo se sustituye la duración: el módulo de constantes no es el módulo bajo prueba.
jest.mock('./transferWindow', () => ({
  ...jest.requireActual('./transferWindow'),
  TRANSFER_WINDOW_MS: 5000,
}));

const NOW = Date.UTC(2026, 9, 31, 15, 0, 0);
const draft: TransferDraft = {
  cents: 30,
  currency: 'USD',
  document: '12345678900',
  date: { year: 2026, month: 10, day: 31 },
};

function attemptAgo(elapsedMs: number): TransferAttempt {
  return { draft, outcome: 'immediate', finishedAt: NOW - elapsedMs };
}

function retainedAfterFinishing(older: TransferAttempt): boolean {
  const finished: TransferAttempt = { draft, outcome: 'scheduled', finishedAt: NOW };
  useTransferStore.setState({ attempts: [older] });

  finishAttempt(finished);

  return useTransferStore.getState().attempts.includes(older);
}

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(NOW);
  resetTransfers();
});

afterEach(() => {
  jest.useRealTimers();
});

it('la retención de intentos y el aviso de duplicado siguen la misma ventana', () => {
  const justInside = attemptAgo(4999);
  const onTheEdge = attemptAgo(5000);
  const justOutside = attemptAgo(5001);

  expect(retainedAfterFinishing(justInside)).toBe(true);
  expect(findRecentDuplicate([justInside], draft, NOW)).not.toBeNull();

  expect(retainedAfterFinishing(onTheEdge)).toBe(true);
  expect(findRecentDuplicate([onTheEdge], draft, NOW)).toBeNull();

  expect(retainedAfterFinishing(justOutside)).toBe(false);
  expect(findRecentDuplicate([justOutside], draft, NOW)).toBeNull();
});
