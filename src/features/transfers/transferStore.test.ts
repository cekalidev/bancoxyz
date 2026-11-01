import {
  consumeStaleDate,
  finishAttempt,
  flagStaleDate,
  resetTransfers,
  setDraft,
  setSending,
  startNewDraft,
} from './transferActions';
import { INITIAL_TRANSFER_STATE, useTransferStore } from './transferStore';
import type { TransferAttempt, TransferDraft } from './types';

const draft: TransferDraft = {
  cents: 15050,
  currency: 'USD',
  document: '12345678900',
  date: { year: 2026, month: 10, day: 31 },
};

const attempt: TransferAttempt = { draft, outcome: 'immediate', finishedAt: 1_000 };

const MINUTE = 60_000;
const NOW = Date.UTC(2026, 9, 31, 15, 0, 0);

type StoreModule = typeof import('./transferStore');

function loadStoreInFreshRegistry(): StoreModule {
  let loaded: StoreModule | null = null;
  jest.isolateModules(() => {
    loaded = jest.requireActual<StoreModule>('./transferStore');
  });
  if (!loaded) throw new Error('no se cargó el store');
  return loaded;
}

beforeEach(() => {
  useTransferStore.setState(INITIAL_TRANSFER_STATE, true);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it('empezar un borrador nuevo vacía el borrador y el último resultado y conserva el registro de intentos', () => {
  useTransferStore.setState({ draft, lastAttempt: attempt, attempts: [attempt] });

  startNewDraft();

  expect(useTransferStore.getState()).toStrictEqual({
    ...INITIAL_TRANSFER_STATE,
    attempts: [attempt],
  });
});

it('guardar el borrador y marcar el envío actualizan el estado', () => {
  setDraft(draft);
  expect(useTransferStore.getState()).toStrictEqual({ ...INITIAL_TRANSFER_STATE, draft });

  setSending(true);
  expect(useTransferStore.getState()).toStrictEqual({ ...INITIAL_TRANSFER_STATE, draft, sending: true });

  setSending(false);
  expect(useTransferStore.getState()).toStrictEqual({ ...INITIAL_TRANSFER_STATE, draft, sending: false });
});

it('terminar un intento lo añade al registro, deja de enviar y descarta los de más de diez minutos', () => {
  jest.useFakeTimers().setSystemTime(NOW);
  const expired: TransferAttempt = { ...attempt, finishedAt: NOW - 10 * MINUTE - 1 };
  const atLimit: TransferAttempt = { ...attempt, finishedAt: NOW - 10 * MINUTE };
  const recent: TransferAttempt = { ...attempt, outcome: 'uncertain', finishedAt: NOW - 2 * MINUTE };
  const finished: TransferAttempt = { draft, outcome: 'scheduled', finishedAt: NOW };
  useTransferStore.setState({ draft, sending: true, attempts: [expired, atLimit, recent] });

  finishAttempt(finished);

  expect(useTransferStore.getState()).toStrictEqual({
    ...INITIAL_TRANSFER_STATE,
    draft,
    sending: false,
    lastAttempt: finished,
    attempts: [atLimit, recent, finished],
  });
});

it('el aviso de fecha caducada se consume una sola vez', () => {
  expect(consumeStaleDate()).toBe(false);

  flagStaleDate();
  expect(useTransferStore.getState().staleDateNotice).toBe(true);

  expect(consumeStaleDate()).toBe(true);
  expect(useTransferStore.getState().staleDateNotice).toBe(false);
  expect(consumeStaleDate()).toBe(false);
});

it('resetTransfers vuelve al estado inicial', () => {
  useTransferStore.setState({
    draft,
    sending: true,
    lastAttempt: attempt,
    attempts: [attempt],
    staleDateNotice: true,
  });

  resetTransfers();

  expect(useTransferStore.getState()).toStrictEqual(INITIAL_TRANSFER_STATE);
});

it('el registro vive solo en memoria: otra carga del módulo empieza vacía', () => {
  jest.useFakeTimers().setSystemTime(NOW);
  const finished: TransferAttempt = { draft, outcome: 'immediate', finishedAt: NOW };
  finishAttempt(finished);

  const reloaded = loadStoreInFreshRegistry();

  expect(reloaded.useTransferStore.getState().attempts).toStrictEqual([]);
  expect(useTransferStore.getState().attempts).toStrictEqual([finished]);
});
