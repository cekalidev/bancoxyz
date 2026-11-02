import { useRef, useState } from 'react';
import type { PressableInstance, TextInputInstance } from 'react-native';

import type { Balance } from '@/services/api/types';
import { applyAmountInput, truncateToCents, type AmountInput } from '@/utils/amountInput';
import { todayLocal, type CalendarDate } from '@/utils/date';
import { documentDigitsFrom } from '@/utils/document';

import { recheckField } from './recheckTransferField';
import type { TransferErrors, TransferField } from './types';
import { useDateFieldPicker } from './useDateFieldPicker';
import type { TransferLimits, TransferValues } from './validateTransfer';

const EMPTY_AMOUNT: AmountInput = { text: '', cents: null };

function useFieldRefs() {
  const amountRef = useRef<TextInputInstance>(null);
  const documentRef = useRef<TextInputInstance>(null);
  const dateRef = useRef<PressableInstance>(null);
  return { amountRef, documentRef, dateRef };
}

// Errores por campo; `recheck` revalida el campo cambiado con su valor nuevo, antes del siguiente render.
function useTransferErrors(values: TransferValues, limits: TransferLimits) {
  const [errors, setErrors] = useState<TransferErrors>({});
  const recheck = (field: TransferField, changed: Partial<TransferValues>) =>
    setErrors((current) => recheckField(current, field, { values: { ...values, ...changed }, limits }));
  return { errors, setErrors, recheck };
}

// Estado local de los campos: vacíos y con la fecha de hoy al abrir el formulario.
// El tope es el saldo recibido truncado a centavos: la ayuda y la validación usan el mismo.
export function useTransferFields(balance: Balance) {
  const [today, setToday] = useState(todayLocal);
  const [amount, setAmount] = useState(EMPTY_AMOUNT);
  const [documentDigits, setDocumentDigits] = useState('');
  const [date, setDate] = useState(today);
  const refs = useFieldRefs();
  const capCents = truncateToCents(balance.amount);
  const values: TransferValues = { cents: amount.cents, document: documentDigits, date };

  const { errors, setErrors, recheck } = useTransferErrors(values, { capCents, today });
  const changeAmount = (text: string) => {
    const next = applyAmountInput(amount.text, text);
    setAmount(next);
    recheck('amount', { cents: next.cents });
  };
  const changeDocument = (text: string) => {
    const digits = documentDigitsFrom(text);
    setDocumentDigits(digits);
    recheck('document', { document: digits });
  };
  const changeDate = (picked: CalendarDate) => {
    setDate(picked);
    recheck('date', { date: picked });
  };
  const picker = useDateFieldPicker({ date, today, onPick: changeDate, fieldRef: refs.dateRef });

  return {
    capCents,
    today,
    setToday,
    amountText: amount.text,
    values,
    errors,
    setErrors,
    changeAmount,
    changeDocument,
    ...picker,
    refs,
  };
}
