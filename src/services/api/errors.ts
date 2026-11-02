export type ApiErrorKind = 'badRequest' | 'invalidCredentials' | 'unauthorized' | 'network' | 'unknown';

export const ERROR_MESSAGES: Record<ApiErrorKind, string> = {
  badRequest: 'Revisa los datos e inténtalo de nuevo.',
  invalidCredentials: 'Correo o contraseña incorrectos.',
  unauthorized: 'Tu sesión expiró. Inicia sesión de nuevo.',
  network: 'No hay conexión. Revisa tu internet e inténtalo de nuevo.',
  unknown: 'Algo salió mal. Inténtalo de nuevo.',
};

export class ApiError extends Error {
  readonly kind: ApiErrorKind;

  constructor(kind: ApiErrorKind) {
    super(ERROR_MESSAGES[kind]);
    this.name = 'ApiError';
    this.kind = kind;
  }
}
