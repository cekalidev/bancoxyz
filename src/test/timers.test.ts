import { REQUEST_TIMEOUT_MS } from '@/services/api/withTimeout';

import { advancePastTimeout } from './timers';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('advancePastTimeout', () => {
  it('avanza el reloj simulado hasta que vence la espera máxima de una petición', async () => {
    const atTimeout = jest.fn();
    const afterTimeout = jest.fn();
    setTimeout(atTimeout, REQUEST_TIMEOUT_MS);
    setTimeout(afterTimeout, REQUEST_TIMEOUT_MS + 1);

    await advancePastTimeout();

    expect(atTimeout).toHaveBeenCalledTimes(1);
    expect(afterTimeout).not.toHaveBeenCalled();
  });
});
