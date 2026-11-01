const CPF_LENGTH = 11;
const CNPJ_LENGTH = 14;
const MAX_DIGITS = CNPJ_LENGTH;

export function documentDigitsFrom(text: string): string {
  return text.replace(/\D/g, '').slice(0, MAX_DIGITS);
}

function formatCpf(digits: string): string {
  const groups = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9)];
  const verifier = digits.slice(9);

  return groups.filter(Boolean).join('.') + (verifier && `-${verifier}`);
}

function formatCnpj(digits: string): string {
  const base = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}`;
  const verifier = digits.slice(12);

  return base + (verifier && `-${verifier}`);
}

export function formatDocument(digits: string): string {
  return digits.length > CPF_LENGTH ? formatCnpj(digits) : formatCpf(digits);
}

export function documentKind(digits: string): 'CPF' | 'CNPJ' | null {
  if (digits.length === CPF_LENGTH) {
    return 'CPF';
  }

  return digits.length === CNPJ_LENGTH ? 'CNPJ' : null;
}
