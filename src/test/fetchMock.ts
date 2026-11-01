import { API_URLS } from '@/services/api/endpoints';

type FetchArgs = Parameters<typeof fetch>;

export type FetchCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
};

export type PendingFetch = { resolve: (status: number, body: unknown) => void };

export type PendingEachFetch = {
  resolve: (callIndex: number, status: number, body: unknown) => void;
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function spyFetch() {
  return jest.spyOn(global, 'fetch');
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export function mockFetchRawBody(status: number, text: string) {
  return spyFetch().mockImplementation(async () => new Response(text, { status, headers: JSON_HEADERS }));
}

export function mockFetchResponse(status: number, body: unknown) {
  return mockFetchRawBody(status, JSON.stringify(body));
}

export function mockFetchNetworkError() {
  return spyFetch().mockRejectedValue(new TypeError('Network request failed'));
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

function mockPendingFetch(respectAbort: boolean): PendingFetch {
  let settle: (response: Response) => void = () => undefined;
  spyFetch().mockImplementation(
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

export function mockFetchPendingEach(): PendingEachFetch {
  const settlers: ((response: Response) => void)[] = [];
  spyFetch().mockImplementation(
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

function toPlainHeaders(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers || Array.isArray(headers)) {
    return Object.fromEntries(new Headers(headers).entries());
  }
  return { ...headers };
}

function parseBody(body: BodyInit | null | undefined): unknown {
  return typeof body === 'string' ? JSON.parse(body) : undefined;
}

export function lastFetchCall(): FetchCall {
  const calls = jest.mocked(global.fetch).mock.calls;
  if (calls.length === 0) throw new Error('fetch no fue llamado');
  const [input, init] = calls[calls.length - 1];
  return {
    url: String(input),
    method: init?.method ?? 'GET',
    headers: toPlainHeaders(init?.headers),
    body: parseBody(init?.body),
  };
}

export type Reply = { status: number; body: unknown } | { raw: string; status: number } | 'pending' | 'networkError';

type ApiRoute = 'login' | 'balance' | 'transfer';

export function reply(status: number, body: unknown): Reply {
  return { status, body };
}

function pendingUntilAbort(signal: AbortSignal | null | undefined): Promise<Response> {
  return new Promise<Response>((_resolve, reject) => {
    pendingRejects.push(reject);
    if (signal?.aborted) reject(abortError());
    signal?.addEventListener('abort', () => reject(abortError()));
  });
}

async function answer(route: Reply, signal: AbortSignal | null | undefined): Promise<Response> {
  if (route === 'pending') return pendingUntilAbort(signal);
  if (route === 'networkError') throw new TypeError('Network request failed');
  if ('raw' in route) return new Response(route.raw, { status: route.status, headers: JSON_HEADERS });
  return jsonResponse(route.status, route.body);
}

export function mockApiRoutes(routes: Partial<Record<ApiRoute, Reply>>) {
  return spyFetch().mockImplementation((...[input, init]: FetchArgs) => {
    const url = String(input);
    const name = (Object.keys(routes) as ApiRoute[]).find((key) => API_URLS[key] === url);
    const route = name ? routes[name] : undefined;
    if (!route) throw new Error(`fetch recibió una URL no prevista: ${url}`);
    return answer(route, init?.signal);
  });
}
