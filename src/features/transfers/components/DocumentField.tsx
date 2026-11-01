import type { Ref } from 'react';
import type { TextInputInstance } from 'react-native';

import { TextField } from '@/components/TextField';
import { formatDocument } from '@/utils/document';

type DocumentFieldProps = {
  digits: string;
  onChange: (text: string) => void;
  error?: string;
  inputRef: Ref<TextInputInstance>;
};

export function DocumentField({ digits, onChange, error, inputRef }: DocumentFieldProps) {
  return (
    <TextField
      label="Documento del destinatario"
      value={formatDocument(digits)}
      onChangeText={onChange}
      error={error}
      inputRef={inputRef}
      keyboardType="number-pad"
      autoComplete="off"
      returnKeyType="done"
      submitBehavior="blurAndSubmit"
      hint={{ text: 'CPF (11 dígitos) o CNPJ (14 dígitos)' }}
    />
  );
}
