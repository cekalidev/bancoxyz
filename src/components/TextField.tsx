import { useState } from 'react';
import type { ReactNode, Ref } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputInstance, TextInputProps } from 'react-native';

import { FieldError } from '@/components/FieldError';
import { borders, colors, layout, radii, spacing, typography } from '@/theme';

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
>;

export type TextFieldProps = ForwardedInputProps & {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  editable?: boolean;
  inputRef?: Ref<TextInputInstance>;
  right?: ReactNode;
};

type FieldState = 'rest' | 'focus' | 'error' | 'disabled';

function fieldState(editable: boolean, error: string | undefined, focused: boolean): FieldState {
  if (!editable) return 'disabled';
  if (error) return 'error';
  return focused ? 'focus' : 'rest';
}

export function TextField({ label, error, editable = true, inputRef, right, ...inputProps }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const state = fieldState(editable, error, focused);

  return (
    <View>
      <Text style={styles.label} accessibilityElementsHidden importantForAccessibility="no">
        {label}
      </Text>
      <View style={[styles.box, boxStates[state]]}>
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
    </View>
  );
}

const boxStates = StyleSheet.create({
  rest: { borderWidth: borders.regular, borderColor: colors.border, backgroundColor: colors.background },
  focus: { borderWidth: borders.strong, borderColor: colors.focus, backgroundColor: colors.background },
  error: { borderWidth: borders.strong, borderColor: colors.error, backgroundColor: colors.background },
  disabled: {
    borderWidth: borders.regular,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
});

const styles = StyleSheet.create({
  label: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  box: {
    minHeight: layout.inputHeight,
    borderRadius: radii.input,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
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
