const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isCurrencyCode(value: unknown): value is string {
  return typeof value === 'string' && CURRENCY_CODE_PATTERN.test(value);
}
