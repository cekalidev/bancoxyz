import { REQUEST_TIMEOUT_MS } from '@/services/api/withTimeout';

// Avanza el reloj simulado hasta que vence la espera máxima de una petición.
export function advancePastTimeout() {
  return jest.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
}
