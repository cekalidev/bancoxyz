import type { TransferErrors, TransferField } from './types';
import {
  validateAmount,
  validateDate,
  validateDocument,
  type TransferLimits,
  type TransferValues,
} from './validateTransfer';

export type RecheckInput = { values: TransferValues; limits: TransferLimits };

const FIELD_VALIDATORS: Record<TransferField, (input: RecheckInput) => string | undefined> = {
  amount: ({ values, limits }) => validateAmount(values.cents, limits.capCents),
  document: ({ values }) => validateDocument(values.document),
  date: ({ values, limits }) => validateDate(values.date, limits.today),
};

// Revalida solo un campo que ya mostraba error; los demás esperan al siguiente «Continuar».
export function recheckField(errors: TransferErrors, field: TransferField, input: RecheckInput): TransferErrors {
  if (!errors[field]) return errors;
  const { [field]: _previous, ...others } = errors;
  const message = FIELD_VALIDATORS[field](input);
  return message ? { ...others, [field]: message } : others;
}
