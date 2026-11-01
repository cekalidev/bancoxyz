import { useState } from 'react';
import type { ReactNode, Ref } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputInstance, TextInputProps } from 'react-native';

import { FieldError } from '@/components/FieldError';
import { FieldHint } from '@/components/FieldHint';
import type { FieldHintProps } from '@/components/FieldHint';
import { fieldBoxStyles } from '@/components/fieldBoxStyles';
import { colors, spacing, typography } from '@/theme';

type ForwardedInputProps = Pick<
  TextInputProps,
  | 'keyboardType'
  | 'autoCapitalize'
  | 'autoCorrect'
  | 'autoComplete'
  | 'textContentType'
  | 'returnKeyType'
  | 'submitBehavior'
  | 'onSubmitEditing'
  | 'secureTextEntry'
  | 'placeholder'
  | 'accessibilityValue'
>;

export type TextFieldProps = ForwardedInputProps & {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  editable?: boolean;
  inputRef?: Ref<TextInputInstance>;
  right?: ReactNode;
  left?: ReactNode;
  hint?: FieldHintProps;
  prefix?: string;
};

type FieldState = 'rest' | 'focus' | 'error' | 'disabled';

function fieldState(editable: boolean, error: string | undefined, focused: boolean): FieldState {
  if (!editable) return 'disabled';
  if (error) return 'error';
  return focused ? 'focus' : 'rest';
}

function Prefix({ text }: { text: string }) {
  return (
    <Text accessible={false} importantForAccessibility="no" style={styles.prefix}>
      {text}
    </Text>
  );
}

export function TextField({
  label,
  error,
  editable = true,
  inputRef,
  right,
  left,
  hint,
  prefix,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const state = fieldState(editable, error, focused);

  return (
    <View>
      <Text style={styles.label} accessibilityElementsHidden importantForAccessibility="no">
        {label}
      </Text>
      <View style={[fieldBoxStyles.box, fieldBoxStyles[state]]}>
        {left}
        {prefix ? <Prefix text={prefix} /> : null}
        <TextInput
          {...inputProps}
          ref={inputRef}
          accessibilityLabel={label}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor={colors.placeholder}
          style={[styles.input, !editable && styles.inputDisabled]}
        />
        {right}
      </View>
      <FieldError message={error} />
      {!error && hint ? <FieldHint {...hint} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  prefix: {
    ...typography.body,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  input: {
    ...typography.body,
    flex: 1,
    alignSelf: 'stretch',
    padding: spacing.none,
    color: colors.text,
  },
  inputDisabled: {
    color: colors.disabledText,
  },
});
