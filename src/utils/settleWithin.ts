export function settleWithin<T, F>(promise: Promise<T>, ms: number, fallback: F): Promise<T | F> {
  return new Promise<T | F>((resolve, reject) => {
    let settled = false;
    const finish = (settle: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      settle();
    };
    const timer = setTimeout(() => finish(() => resolve(fallback)), ms);
    promise.then(
      (value) => finish(() => resolve(value)),
      (error: unknown) => finish(() => reject(error)),
    );
  });
}
