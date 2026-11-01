import type { Ref } from 'react';
import type { TextInputInstance } from 'react-native';

import { TextField } from '@/components/TextField';
import { applyAmountInput, centsToAmount } from '@/utils/amountInput';
import { currencySymbol, formatMoney } from '@/utils/money';
import { spokenMoney } from '@/utils/spokenMoney';

type AmountFieldProps = {
  value: string;
  onChange: (text: string) => void;
  error?: string;
  onNext: () => void;
  cap: { cents: number; currency: string };
  inputRef: Ref<TextInputInstance>;
};

function availableHint({ cents, currency }: AmountFieldProps['cap']) {
  const amount = centsToAmount(cents);
  return {
    text: `Disponible: ${formatMoney(amount, currency)}`,
    spoken: `Disponible: ${spokenMoney(amount, currency)}`,
  };
}

// Lo que el lector dice del valor: el importe hablado, sin el símbolo; vacío no dice nada.
function spokenValue(text: string, currency: string) {
  const { cents } = applyAmountInput('', text);
  return cents === null ? undefined : { text: spokenMoney(centsToAmount(cents), currency) };
}

export function AmountField({ value, onChange, error, onNext, cap, inputRef }: AmountFieldProps) {
  return (
    <TextField
      label="Valor"
      value={value}
      onChangeText={onChange}
      error={error}
      inputRef={inputRef}
      keyboardType="number-pad"
      returnKeyType="next"
      submitBehavior="submit"
      onSubmitEditing={onNext}
      prefix={currencySymbol(cap.currency)}
      placeholder="0,00"
      hint={availableHint(cap)}
      accessibilityValue={spokenValue(value, cap.currency)}
    />
  );
}
