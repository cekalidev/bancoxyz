import { defer, type Deferred } from './defer';

type FetchArgs = Parameters<typeof fetch>;

export type PendingFetch = { resolve: (status: number, body: unknown) => void };

export type PendingEachFetch = {
  resolve: (callIndex: number, status: number, body: unknown) => void;
};

export const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function abortError(): Error {
  return Object.assign(new Error('Aborted'), { name: 'AbortError' });
}

const pendingRejects: ((error: Error) => void)[] = [];

// Rechaza como abortados los fetch que siguen sin respuesta y vacía la lista.
// Se llama al terminar cada test, con la pantalla ya desmontada, para que el
// timer del tope de la petición se limpie y no mantenga vivo el proceso.
export function settlePendingFetches(): void {
  pendingRejects.splice(0).forEach((reject) => reject(abortError()));
}

// Respuesta que el test suelta a mano; si no la suelta, se rechaza al terminar el test.
export function deferFetch(): Deferred<Response> {
  const held = defer<Response>();
  pendingRejects.push((error) => held.reject(error));
  return held;
}

function mockPendingFetch(respectAbort: boolean): PendingFetch {
  let settle: (response: Response) => void = () => undefined;
  jest.spyOn(global, 'fetch').mockImplementation(
    (...[, init]: FetchArgs) =>
      new Promise<Response>((resolve, reject) => {
        settle = resolve;
        pendingRejects.push(reject);
        if (respectAbort) init?.signal?.addEventListener('abort', () => reject(abortError()));
      }),
  );
  return { resolve: (status, body) => settle(jsonResponse(status, body)) };
}

export function mockFetchPending(): PendingFetch {
  return mockPendingFetch(true);
}

export function mockFetchPendingIgnoringAbort(): PendingFetch {
  return mockPendingFetch(false);
}

export function pendingUntilAbort(signal: AbortSignal | null | undefined): Promise<Response> {
  return new Promise<Response>((_resolve, reject) => {
    pendingRejects.push(reject);
    if (signal?.aborted) reject(abortError());
    signal?.addEventListener('abort', () => reject(abortError()));
  });
}

export function mockFetchPendingEach(): PendingEachFetch {
  const settlers: ((response: Response) => void)[] = [];
  jest.spyOn(global, 'fetch').mockImplementation(
    (...[, init]: FetchArgs) =>
      new Promise<Response>((resolve, reject) => {
        settlers.push(resolve);
        pendingRejects.push(reject);
        const signal = init?.signal;
        if (signal?.aborted) reject(abortError());
        signal?.addEventListener('abort', () => reject(abortError()));
      }),
  );
  return {
    resolve: (callIndex, status, body) => {
      const settle = settlers[callIndex];
      if (!settle) throw new Error(`fetch no recibió la llamada ${callIndex}`);
      settle(jsonResponse(status, body));
    },
  };
}
