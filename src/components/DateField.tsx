import type { Ref } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PressableInstance } from 'react-native';

import { fieldBoxStyles } from '@/components/fieldBoxStyles';
import { FieldError } from '@/components/FieldError';
import { FieldHint } from '@/components/FieldHint';
import type { FieldHintProps } from '@/components/FieldHint';
import { CalendarIcon } from '@/components/icons/CalendarIcon';
import { colors, spacing, typography } from '@/theme';

export type DateFieldProps = {
  label: string;
  text: string;
  spokenLabel: string;
  hint: FieldHintProps;
  error?: string;
  onPress: () => void;
  fieldRef?: Ref<PressableInstance>;
};

export function DateField({ label, text, spokenLabel, hint, error, onPress, fieldRef }: DateFieldProps) {
  return (
    <View>
      <Text style={styles.label} accessibilityElementsHidden importantForAccessibility="no">
        {label}
      </Text>
      <Pressable
        ref={fieldRef}
        accessibilityRole="button"
        accessibilityLabel={spokenLabel}
        accessibilityHint="Abre el calendario"
        onPress={onPress}
        style={[fieldBoxStyles.box, error ? fieldBoxStyles.error : fieldBoxStyles.rest, styles.field]}
      >
        <Text style={styles.text}>{text}</Text>
        <CalendarIcon color={colors.textSecondary} />
      </Pressable>
      <FieldError message={error} />
      {!error ? <FieldHint {...hint} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  field: {
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  text: {
    ...typography.body,
    flexShrink: 1,
    color: colors.text,
  },
});
