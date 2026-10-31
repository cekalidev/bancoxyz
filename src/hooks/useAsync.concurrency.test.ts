import { StrictMode } from 'react';

import { act, renderHook } from '@testing-library/react-native';

import { type RunOutcome, useAsync } from '@/hooks/useAsync';
import { defer } from '@/test/defer';

type Balance = { amount: number };

describe('useAsync con una ejecución en curso', () => {
  it('marca la petición en curso y no la repite mientras dura', async () => {
    const pendingBalance = defer<Balance>();
    const task = jest.fn<Promise<Balance>, []>().mockReturnValue(pendingBalance.promise);
    const { result } = await renderHook(() => useAsync(task));

    let first: Promise<RunOutcome> = Promise.resolve('skipped');
    await act(async () => {
      first = result.current.run();
    });
    expect(result.current.pending).toBe(true);

    let repeated: Promise<RunOutcome[]> = Promise.resolve([]);
    await act(async () => {
      repeated = Promise.all([result.current.run(), result.current.run({ clearError: true })]);
    });
    expect(task).toHaveBeenCalledTimes(1);
    expect(result.current.pending).toBe(true);

    await act(async () => {
      pendingBalance.resolve({ amount: 1800 });
      await expect(first).resolves.toBe('success');
      await repeated;
    });
    expect(task).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({ amount: 1800 });
    expect(result.current.pending).toBe(false);
  });
});

describe('useAsync con una ejecución repetida', () => {
  it('ignora una ejecución mientras hay otra en curso', async () => {
    const failure = new Error('sin conexión');
    const retry = defer<Balance>();
    const task = jest.fn<Promise<Balance>, []>().mockRejectedValueOnce(failure).mockReturnValueOnce(retry.promise);
    const { result } = await renderHook(() => useAsync(task));
    await act(async () => {
      await result.current.run();
    });

    let running: Promise<RunOutcome> = Promise.resolve('skipped');
    await act(async () => {
      running = result.current.run();
    });
    const stateDuringRun = result.current;

    await act(async () => {
      await expect(result.current.run({ clearError: true })).resolves.toBe('skipped');
    });
    expect(task).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBe(failure);
    expect(result.current.errorId).toBe(stateDuringRun.errorId);
    expect(result.current.pending).toBe(true);
    expect(result.current.data).toBe(stateDuringRun.data);

    await act(async () => {
      retry.resolve({ amount: 5 });
      await running;
    });
  });
});

describe('useAsync al terminar una ejecución', () => {
  it('tras terminar admite una nueva', async () => {
    const sessionExpired = new Error('sesión caducada');
    const task = jest
      .fn<Promise<Balance>, []>()
      .mockResolvedValueOnce({ amount: 1 })
      .mockRejectedValueOnce(new Error('sin conexión'))
      .mockRejectedValueOnce(sessionExpired)
      .mockResolvedValueOnce({ amount: 2 });
    const { result } = await renderHook(() => useAsync(task, { ignoreError: (error) => error === sessionExpired }));

    const outcomes: RunOutcome[] = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await act(async () => {
        outcomes.push(await result.current.run());
      });
    }

    expect(outcomes).toEqual(['success', 'error', 'ignored', 'success']);
    expect(task).toHaveBeenCalledTimes(4);
    expect(result.current.data).toEqual({ amount: 2 });
  });
});

describe('useAsync al desmontar', () => {
  it('descarta el resultado y el error que llegan tras desmontar', async () => {
    const sessionExpired = new Error('sesión caducada');
    const pendingBalance = defer<Balance>();
    const pendingFailure = defer<Balance>();
    const pendingExpired = defer<Balance>();
    const outcomes: Promise<RunOutcome>[] = [];
    for (const { promise } of [pendingBalance, pendingFailure, pendingExpired]) {
      const { result, unmount } = await renderHook(() =>
        useAsync(() => promise, { ignoreError: (error) => error === sessionExpired }),
      );
      await act(async () => {
        outcomes.push(result.current.run());
      });
      await unmount();
    }

    await act(async () => {
      pendingBalance.resolve({ amount: 1800 });
      pendingFailure.reject(new Error('sin conexión'));
      pendingExpired.reject(sessionExpired);
    });

    await expect(Promise.all(outcomes)).resolves.toEqual(['discarded', 'discarded', 'discarded']);
  });
});

describe('useAsync en modo estricto', () => {
  it('sigue montado tras el doble montaje del modo estricto y descarta lo que llega al desmontar', async () => {
    const pendingBalance = defer<Balance>();
    const task = jest
      .fn<Promise<Balance>, []>()
      .mockResolvedValueOnce({ amount: 1 })
      .mockReturnValueOnce(pendingBalance.promise);
    const { result, unmount } = await renderHook(() => useAsync(task), { wrapper: StrictMode });

    await act(async () => {
      await expect(result.current.run()).resolves.toBe('success');
    });
    expect(result.current.data).toEqual({ amount: 1 });

    let running: Promise<RunOutcome> = Promise.resolve('skipped');
    await act(async () => {
      running = result.current.run();
    });
    await unmount();
    await act(async () => {
      pendingBalance.resolve({ amount: 2 });
    });
    await expect(running).resolves.toBe('discarded');
  });
});
