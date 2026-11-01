import type { Ref } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import type { PressableInstance } from 'react-native';

import { CloseIcon } from '@/components/icons/CloseIcon';
import { colors, layout } from '@/theme';

export type ClearButtonProps = {
  label: string;
  onPress: () => void;
  buttonRef?: Ref<PressableInstance>;
};

export function ClearButton({ label, onPress, buttonRef }: ClearButtonProps) {
  return (
    <Pressable
      ref={buttonRef}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.button}
    >
      <CloseIcon color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: layout.minTouch,
    height: layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
