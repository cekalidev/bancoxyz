import { API_URLS } from '@/services/api/endpoints';

import { JSON_HEADERS, jsonResponse, pendingUntilAbort } from './fetchPending';

type FetchArgs = Parameters<typeof fetch>;

export type FetchCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
};

function spyFetch() {
  return jest.spyOn(global, 'fetch');
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

type ApiRoute = keyof typeof API_URLS;

export function reply(status: number, body: unknown): Reply {
  return { status, body };
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
