import { addOneYear, isBefore, type CalendarDate } from '@/utils/date';
import { documentKind } from '@/utils/document';

import type { TransferErrors, TransferField } from './types';

export function validateAmount(cents: number | null, capCents: number): string | undefined {
  if (cents === null) {
    return 'Escribe el valor.';
  }

  if (cents <= 0) {
    return 'El valor debe ser mayor que 0.';
  }

  return cents > capCents ? 'El valor supera tu saldo disponible.' : undefined;
}

export function validateDocument(digits: string): string | undefined {
  if (digits === '') {
    return 'Escribe el documento del destinatario.';
  }

  return documentKind(digits) === null
    ? 'El documento debe tener 11 dígitos (CPF) o 14 (CNPJ).'
    : undefined;
}

export function validateDate(date: CalendarDate, today: CalendarDate): string | undefined {
  if (isBefore(date, today)) {
    return 'La fecha no puede ser anterior a hoy.';
  }

  return isBefore(addOneYear(today), date)
    ? 'Elige una fecha dentro del próximo año.'
    : undefined;
}

export type TransferValues = { cents: number | null; document: string; date: CalendarDate };
export type TransferLimits = { capCents: number; today: CalendarDate };

export function validateTransfer(values: TransferValues, limits: TransferLimits): TransferErrors {
  const checks: [TransferField, string | undefined][] = [
    ['amount', validateAmount(values.cents, limits.capCents)],
    ['document', validateDocument(values.document)],
    ['date', validateDate(values.date, limits.today)],
  ];
  const errors: TransferErrors = {};

  for (const [field, message] of checks) {
    if (message !== undefined) {
      errors[field] = message;
    }
  }

  return errors;
}
