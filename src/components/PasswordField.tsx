import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { EyeIcon } from '@/components/icons/EyeIcon';
import { EyeOffIcon } from '@/components/icons/EyeOffIcon';
import { TextField } from '@/components/TextField';
import type { TextFieldProps } from '@/components/TextField';
import { colors, layout } from '@/theme';

export type PasswordFieldProps = Omit<TextFieldProps, 'secureTextEntry' | 'right'>;

export function PasswordField(props: PasswordFieldProps) {
  const [hidden, setHidden] = useState(true);
  const Icon = hidden ? EyeIcon : EyeOffIcon;

  return (
    <TextField
      {...props}
      secureTextEntry={hidden}
      right={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Mostrar contraseña' : 'Ocultar contraseña'}
          onPress={() => setHidden((current) => !current)}
          style={styles.toggle}
        >
          <Icon color={colors.textSecondary} />
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  toggle: {
    width: layout.minTouch,
    height: layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
