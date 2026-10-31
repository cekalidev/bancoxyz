export const LOGIN_MESSAGES = {
  emailRequired: 'Escribe tu correo.',
  emailInvalid: 'Escribe un correo válido.',
  passwordRequired: 'Escribe tu contraseña.',
} as const;

export const EMAIL_MAX_LENGTH = 254;

const EMAIL_FORMAT = /^[^\s@]+@(?:[^\s@.]+\.)+[^\s@.]{2,}$/;

export function normalizeEmail(raw: string): string {
  return raw.trim();
}

export function validateEmail(raw: string): string | undefined {
  const email = normalizeEmail(raw);
  if (email === '') return LOGIN_MESSAGES.emailRequired;
  const tooLong = Array.from(email).length > EMAIL_MAX_LENGTH;
  if (tooLong || !EMAIL_FORMAT.test(email)) return LOGIN_MESSAGES.emailInvalid;
  return undefined;
}

export type LoginField = 'email' | 'password';
export type LoginErrors = Partial<Record<LoginField, string>>;

export function validatePassword(raw: string): string | undefined {
  return raw === '' ? LOGIN_MESSAGES.passwordRequired : undefined;
}

export function validateLogin(values: Record<LoginField, string>): LoginErrors {
  const email = validateEmail(values.email);
  const password = validatePassword(values.password);
  return {
    ...(email && { email }),
    ...(password && { password }),
  };
}
