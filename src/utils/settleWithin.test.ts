import { defer } from '@/test/defer';

import { settleWithin } from './settleWithin';

const TIMEOUT_MS = 3000;
const FALLBACK = 'sin respuesta';

function watch(promise: Promise<unknown>) {
  const outcome: { settled: boolean; value?: unknown } = { settled: false };
  promise.then(
    (value) => Object.assign(outcome, { settled: true, value }),
    () => Object.assign(outcome, { settled: true }),
  );
  return outcome;
}

async function yieldToEventLoop(): Promise<void> {
  jest.useRealTimers();
  await new Promise<void>((resolve) => setImmediate(resolve));
}

afterEach(() => {
  jest.useRealTimers();
});

describe('resultado que llega después del límite', () => {
  it('resuelve con el valor de reserva al agotar el tiempo e ignora el resultado tardío', async () => {
    jest.useFakeTimers();
    const slow = defer<string>();
    const outcome = watch(settleWithin(slow.promise, TIMEOUT_MS, FALLBACK));

    await jest.advanceTimersByTimeAsync(TIMEOUT_MS - 1);
    expect(outcome.settled).toBe(false);

    await jest.advanceTimersByTimeAsync(1);
    expect(outcome).toEqual({ settled: true, value: FALLBACK });

    slow.resolve('resultado tardío');
    await jest.advanceTimersByTimeAsync(0);
    expect(outcome).toEqual({ settled: true, value: FALLBACK });
  });

  it('un rechazo tardío se descarta sin dejar un error sin tratar', async () => {
    jest.useFakeTimers();
    const slow = defer<string>();
    const outcome = watch(settleWithin(slow.promise, TIMEOUT_MS, FALLBACK));

    await jest.advanceTimersByTimeAsync(TIMEOUT_MS - 1);
    expect(outcome.settled).toBe(false);
    await jest.advanceTimersByTimeAsync(1);

    slow.reject(new Error('fallo tardío'));
    await yieldToEventLoop();

    expect(outcome).toEqual({ settled: true, value: FALLBACK });
  });
});

describe('resultado que llega antes del límite', () => {
  it('devuelve el resultado si llega antes', async () => {
    jest.useFakeTimers();
    const fast = defer<string>();
    const outcome = watch(settleWithin(fast.promise, TIMEOUT_MS, FALLBACK));

    await jest.advanceTimersByTimeAsync(TIMEOUT_MS - 1);
    fast.resolve('resultado a tiempo');
    await jest.advanceTimersByTimeAsync(0);

    expect(outcome).toEqual({ settled: true, value: 'resultado a tiempo' });
    expect(jest.getTimerCount()).toBe(0);
    await jest.advanceTimersByTimeAsync(TIMEOUT_MS);
    expect(outcome).toEqual({ settled: true, value: 'resultado a tiempo' });
  });

  it('propaga el rechazo si ocurre antes de agotar el tiempo', async () => {
    jest.useFakeTimers();
    const failing = defer<string>();
    const failure = new Error('fallo a tiempo');
    const result = settleWithin(failing.promise, TIMEOUT_MS, FALLBACK);

    failing.reject(failure);

    await expect(result).rejects.toBe(failure);
    expect(jest.getTimerCount()).toBe(0);
  });
});
