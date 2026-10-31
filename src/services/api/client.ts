import { classifyStatus } from './classifyResponse';
import { ApiError } from './errors';
import { REQUEST_TIMEOUT_MS, withTimeout } from './withTimeout';

export type ApiConfig = { getToken: () => string | null; onUnauthorized: () => void };

export type HttpMethod = 'GET' | 'POST';

export type RequestOptions<T> = {
  url: string;
  method: HttpMethod;
  body?: unknown;
  authenticated: boolean;
  parse: (json: unknown) => T | null;
};

const defaultConfig: ApiConfig = { getToken: () => null, onUnauthorized: () => undefined };

let config: ApiConfig = defaultConfig;
let sessionNoticeSent = false;
let sessionEpoch = 0;

export function configureApi(nextConfig: ApiConfig): void {
  config = nextConfig;
  sessionNoticeSent = false;
}

export function markLoggedIn(): void {
  sessionNoticeSent = false;
  sessionEpoch += 1;
}

export function markLoggedOut(): void {
  sessionEpoch += 1;
}

function notifySessionExpired(): void {
  if (sessionNoticeSent) return;
  sessionNoticeSent = true;
  try {
    config.onUnauthorized();
  } catch {
    // A failing notice must not hide the session error from the caller.
  }
}

function buildHeaders(hasBody: boolean, authenticated: boolean): Record<string, string> {
  const headers: Record<string, string> = {};
  if (hasBody) headers['Content-Type'] = 'application/json';
  const token = authenticated ? config.getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

type RawResponse = { status: number; json: unknown };

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new ApiError('unknown');
  }
}

async function send(options: RequestOptions<unknown>, signal: AbortSignal): Promise<RawResponse> {
  const hasBody = options.body !== undefined;
  const response = await fetch(options.url, {
    method: options.method,
    headers: buildHeaders(hasBody, options.authenticated),
    body: hasBody ? JSON.stringify(options.body) : undefined,
    signal,
  }).catch(() => {
    throw new ApiError('network');
  });
  // Error bodies are never read: the server text must not reach the user.
  const json = response.ok ? await readJson(response) : null;
  return { status: response.status, json };
}

export async function request<T>(options: RequestOptions<T>): Promise<T> {
  const epoch = sessionEpoch;
  const response = await withTimeout((signal) => send(options, signal), REQUEST_TIMEOUT_MS);
  const errorKind = classifyStatus(response.status, options.authenticated);
  // A 401 from a request started in an earlier session must not end the current one.
  if (errorKind === 'unauthorized' && epoch === sessionEpoch) notifySessionExpired();
  if (errorKind) throw new ApiError(errorKind);
  const result = options.parse(response.json);
  if (result === null) throw new ApiError('unknown');
  return result;
}
