import type { Ref } from 'react';
import type { TextInputInstance } from 'react-native';

import { ClearButton } from '@/components/ClearButton';
import { TextField } from '@/components/TextField';
import { applyAmountInput, centsToAmount, formatCents } from '@/utils/amountInput';
import { currencySymbol } from '@/utils/money';
import { spokenMoney } from '@/utils/spokenMoney';

const NO_LIMIT = 'sin límite';

export type AmountBoundFieldProps = {
  label: 'Desde' | 'Hasta';
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  currency: string | null;
  error?: string;
  inputRef?: Ref<TextInputInstance>;
};

// Lo que el lector dice del campo: el importe hablado, sin el símbolo aparte; vacío es «sin límite».
function spokenBound(cents: number | null, currency: string | null): string {
  if (cents === null) return NO_LIMIT;

  return currency ? spokenMoney(centsToAmount(cents), currency) : formatCents(cents);
}

export function AmountBoundField({
  label,
  value,
  onChangeText,
  onClear,
  currency,
  error,
  inputRef,
}: AmountBoundFieldProps) {
  const { cents } = applyAmountInput('', value);

  return (
    <TextField
      label={label}
      value={value}
      onChangeText={onChangeText}
      error={error}
      inputRef={inputRef}
      keyboardType="number-pad"
      placeholder="0,00"
      prefix={currency ? currencySymbol(currency) : undefined}
      accessibilityValue={{ text: spokenBound(cents, currency) }}
      right={
        value !== '' ? (
          <ClearButton label={`Borrar valor ${label.toLowerCase()}`} onPress={onClear} />
        ) : null
      }
    />
  );
}
