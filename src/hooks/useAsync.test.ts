import { act, renderHook } from '@testing-library/react-native';

import { useAsync } from '@/hooks/useAsync';
import { defer } from '@/test/defer';

type Balance = { amount: number; currency?: string };

describe('useAsync con éxito', () => {
  it('con éxito sustituye el dato entero por el del servidor, quita el error y deja de estar pendiente', async () => {
    const first: Balance = { amount: 1800, currency: 'USD' };
    const second: Balance = { amount: 950 };
    const task = jest.fn<Promise<Balance>, []>().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const { result } = await renderHook(() => useAsync(task));

    await act(async () => {
      await expect(result.current.run()).resolves.toBe('success');
    });
    expect(result.current.data).toBe(first);

    await act(async () => {
      await expect(result.current.run()).resolves.toBe('success');
    });
    expect(result.current.data).toBe(second);
    expect(result.current.data).toEqual({ amount: 950 });
    expect(result.current.error).toBeNull();
    expect(result.current.pending).toBe(false);
  });
});

describe('useAsync en curso', () => {
  it('mientras espera marca pendiente y conserva el dato anterior', async () => {
    const previous: Balance = { amount: 1800, currency: 'USD' };
    const next = defer<Balance>();
    const task = jest.fn<Promise<Balance>, []>().mockResolvedValueOnce(previous).mockReturnValueOnce(next.promise);
    const { result } = await renderHook(() => useAsync(task));
    await act(async () => {
      await result.current.run();
    });
    expect(result.current.pending).toBe(false);

    let running: Promise<unknown> = Promise.resolve();
    await act(async () => {
      running = result.current.run();
    });
    expect(result.current.pending).toBe(true);
    expect(result.current.data).toBe(previous);

    await act(async () => {
      next.resolve({ amount: 10 });
      await running;
    });
    expect(result.current.pending).toBe(false);
  });
});

describe('useAsync run', () => {
  it('run conserva su identidad entre renders', async () => {
    const task = jest.fn<Promise<Balance>, []>().mockResolvedValue({ amount: 1 });
    const { result, rerender } = await renderHook(() => useAsync(task, { ignoreError: () => false }));
    const firstRun = result.current.run;

    await rerender({});
    expect(result.current.run).toBe(firstRun);

    await act(async () => {
      await result.current.run();
    });
    expect(result.current.run).toBe(firstRun);
  });
});

describe('useAsync con error', () => {
  it('con error conserva el dato anterior, guarda el error y suma uno al contador de errores', async () => {
    const previous: Balance = { amount: 1800, currency: 'USD' };
    const failure = new Error('sin conexión');
    const task = jest.fn<Promise<Balance>, []>().mockResolvedValueOnce(previous).mockRejectedValueOnce(failure);
    const { result } = await renderHook(() => useAsync(task));
    await act(async () => {
      await result.current.run();
    });
    expect(result.current.errorId).toBe(0);

    await act(async () => {
      await expect(result.current.run()).resolves.toBe('error');
    });
    expect(result.current.data).toBe(previous);
    expect(result.current.error).toBe(failure);
    expect(result.current.pending).toBe(false);
    expect(result.current.errorId).toBe(1);
  });

  it('cada error nuevo suma uno aunque el mensaje sea el mismo', async () => {
    const task = jest
      .fn<Promise<Balance>, []>()
      .mockRejectedValueOnce(new Error('tiempo agotado'))
      .mockRejectedValueOnce(new Error('tiempo agotado'));
    const { result } = await renderHook(() => useAsync(task));

    await act(async () => {
      await expect(result.current.run()).resolves.toBe('error');
    });
    expect(result.current.errorId).toBe(1);

    await act(async () => {
      await expect(result.current.run()).resolves.toBe('error');
    });
    expect(result.current.errorId).toBe(2);
    expect(result.current.error).toEqual(new Error('tiempo agotado'));
  });
});

describe('useAsync al reintentar', () => {
  it('con clearError quita el error al empezar y sin ella lo conserva mientras espera', async () => {
    const failure = new Error('servidor caído');
    const withClear = defer<Balance>();
    const withoutClear = defer<Balance>();
    const task = jest
      .fn<Promise<Balance>, []>()
      .mockRejectedValueOnce(failure)
      .mockReturnValueOnce(withoutClear.promise)
      .mockRejectedValueOnce(failure)
      .mockReturnValueOnce(withClear.promise);
    const { result } = await renderHook(() => useAsync(task));
    await act(async () => {
      await result.current.run();
    });
    let running: Promise<unknown> = Promise.resolve();
    await act(async () => {
      running = result.current.run();
    });
    expect(result.current.pending).toBe(true);
    expect(result.current.error).toBe(failure);
    await act(async () => {
      withoutClear.resolve({ amount: 1 });
      await running;
    });

    await act(async () => {
      await result.current.run();
    });
    await act(async () => {
      running = result.current.run({ clearError: true });
    });
    expect(result.current.pending).toBe(true);
    expect(result.current.error).toBeNull();
    await act(async () => {
      withClear.resolve({ amount: 2 });
      await running;
    });
  });
});

describe('useAsync con error ignorado', () => {
  it('un error ignorado no cambia el estado', async () => {
    const previous: Balance = { amount: 1800, currency: 'USD' };
    const failure = new Error('sin conexión');
    const sessionExpired = new Error('sesión caducada');
    const task = jest
      .fn<Promise<Balance>, []>()
      .mockResolvedValueOnce(previous)
      .mockRejectedValueOnce(failure)
      .mockRejectedValueOnce(sessionExpired);
    const { result } = await renderHook(() => useAsync(task, { ignoreError: (error) => error === sessionExpired }));
    await act(async () => {
      await result.current.run();
    });
    await act(async () => {
      await result.current.run();
    });
    expect(result.current.errorId).toBe(1);

    await act(async () => {
      await expect(result.current.run()).resolves.toBe('ignored');
    });
    expect(result.current.data).toBe(previous);
    expect(result.current.error).toBe(failure);
    expect(result.current.errorId).toBe(1);
    // La petición empezó con pending en true y el error ignorado no lo vuelve a tocar.
    expect(result.current.pending).toBe(true);
  });
});
