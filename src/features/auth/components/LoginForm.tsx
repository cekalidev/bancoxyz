import { StyleSheet, View } from 'react-native';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { PasswordField } from '@/components/PasswordField';
import { TextField } from '@/components/TextField';
import type { TextFieldProps } from '@/components/TextField';
import { spacing } from '@/theme';

import { useLoginForm } from '../useLoginForm';

const EMAIL_KEYBOARD = {
  keyboardType: 'email-address',
  autoCapitalize: 'none',
  autoCorrect: false,
  autoComplete: 'email',
  returnKeyType: 'next',
  submitBehavior: 'submit',
} as const satisfies Partial<TextFieldProps>;

export function LoginForm() {
  const form = useLoginForm();

  return (
    <View>
      <TextField
        label="Correo electrónico"
        value={form.email}
        onChangeText={form.changeEmail}
        error={form.errors.email}
        inputRef={form.emailRef}
        editable={!form.submitting}
        {...EMAIL_KEYBOARD}
        onSubmitEditing={form.focusPassword}
      />
      <View style={styles.gap}>
        <PasswordField
          label="Contraseña"
          value={form.password}
          onChangeText={form.changePassword}
          error={form.errors.password}
          inputRef={form.passwordRef}
          editable={!form.submitting}
          autoComplete="current-password"
          returnKeyType="go"
          onSubmitEditing={form.submit}
        />
      </View>
      <View style={form.serverError ? styles.banner : null}>
        <Banner variant="error" message={form.serverError} />
      </View>
      <View style={styles.gap}>
        <Button label="Entrar" busyLabel="Entrando…" busy={form.submitting} onPress={form.submit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: {
    marginTop: spacing.md,
  },
  banner: {
    marginTop: spacing.xl,
  },
});
