import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

export type RunOutcome = 'success' | 'error' | 'ignored' | 'skipped' | 'discarded';

export type AsyncState<T> = { data: T | undefined; error: unknown; pending: boolean; errorId: number };

export type UseAsyncOptions = { ignoreError?: (error: unknown) => boolean };

export type RunOptions = { clearError?: boolean };

export type UseAsyncResult<T> = AsyncState<T> & { run: (runOptions?: RunOptions) => Promise<RunOutcome> };

const initialState = { data: undefined, error: null, pending: false, errorId: 0 };

type SetState<T> = Dispatch<SetStateAction<AsyncState<T>>>;

function startPending<T>(setState: SetState<T>, clearError: boolean | undefined): void {
  setState((current) => ({
    ...current,
    pending: true,
    error: clearError ? null : current.error,
  }));
}

function settleSuccess<T>(setState: SetState<T>, data: T): RunOutcome {
  setState((current) => ({ ...current, data, error: null, pending: false }));
  return 'success';
}

function settleError<T>(setState: SetState<T>, error: unknown): RunOutcome {
  setState((current) => ({ ...current, error, pending: false, errorId: current.errorId + 1 }));
  return 'error';
}

export function useAsync<T>(task: () => Promise<T>, options?: UseAsyncOptions): UseAsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>(initialState);
  const taskRef = useRef(task);
  const optionsRef = useRef(options);
  const inFlight = useRef(false);
  const mounted = useRef(false);
  useLayoutEffect(() => {
    taskRef.current = task;
    optionsRef.current = options;
  });
  // Vuelve a marcar el montaje en cada efecto: el modo estricto desmonta y monta de nuevo.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (runOptions?: RunOptions): Promise<RunOutcome> => {
    if (inFlight.current) return 'skipped';
    inFlight.current = true;
    startPending(setState, runOptions?.clearError);
    try {
      const data = await taskRef.current();
      if (!mounted.current) return 'discarded';
      return settleSuccess<T>(setState, data);
    } catch (error) {
      if (!mounted.current) return 'discarded';
      if (optionsRef.current?.ignoreError?.(error)) return 'ignored';
      return settleError(setState, error);
    } finally {
      inFlight.current = false;
    }
  }, []);

  return { ...state, run };
}
