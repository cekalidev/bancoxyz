import type { ReactNode, Ref } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PressableInstance } from 'react-native';

import { fieldBoxStyles } from '@/components/fieldBoxStyles';
import { FieldError } from '@/components/FieldError';
import { FieldHint } from '@/components/FieldHint';
import type { FieldHintProps } from '@/components/FieldHint';
import { CalendarIcon } from '@/components/icons/CalendarIcon';
import { colors, layout, spacing, typography } from '@/theme';

const OPEN_CALENDAR_HINT = 'Abre el calendario';

export type DateFieldProps = {
  label: string;
  text: string;
  spokenLabel: string;
  hint?: FieldHintProps;
  error?: string;
  onPress: () => void;
  fieldRef?: Ref<PressableInstance>;
  right?: ReactNode;
};

type BoxProps = Pick<DateFieldProps, 'text' | 'spokenLabel' | 'onPress' | 'fieldRef'> & {
  invalid: boolean;
};

function boxStyles(invalid: boolean) {
  return [fieldBoxStyles.box, invalid ? fieldBoxStyles.error : fieldBoxStyles.rest, styles.field];
}

function PlainBox({ text, spokenLabel, onPress, fieldRef, invalid }: BoxProps) {
  return (
    <Pressable
      ref={fieldRef}
      accessibilityRole="button"
      accessibilityLabel={spokenLabel}
      accessibilityHint={OPEN_CALENDAR_HINT}
      onPress={onPress}
      style={boxStyles(invalid)}
    >
      <Text style={styles.text}>{text}</Text>
      <CalendarIcon color={colors.textSecondary} />
    </Pressable>
  );
}

function CalendarButton({ onPress }: Pick<BoxProps, 'onPress'>) {
  return (
    <Pressable
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      onPress={onPress}
      style={styles.calendar}
    >
      <CalendarIcon color={colors.textSecondary} />
    </Pressable>
  );
}

function BoxWithAction({ text, spokenLabel, onPress, fieldRef, invalid, right }: BoxProps & { right: ReactNode }) {
  return (
    <View style={boxStyles(invalid)}>
      <Pressable
        ref={fieldRef}
        accessibilityRole="button"
        accessibilityLabel={spokenLabel}
        accessibilityHint={OPEN_CALENDAR_HINT}
        onPress={onPress}
        style={styles.main}
      >
        <Text style={styles.text}>{text}</Text>
      </Pressable>
      {right}
      <CalendarButton onPress={onPress} />
    </View>
  );
}

export function DateField({ label, text, spokenLabel, hint, error, onPress, fieldRef, right }: DateFieldProps) {
  const box = { text, spokenLabel, onPress, fieldRef, invalid: Boolean(error) };

  return (
    <View>
      <Text style={styles.label} accessibilityElementsHidden importantForAccessibility="no">
        {label}
      </Text>
      {right ? <BoxWithAction {...box} right={right} /> : <PlainBox {...box} />}
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
  field: {
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  main: {
    flex: 1,
    alignSelf: 'stretch',
    minHeight: layout.minTouch,
    justifyContent: 'center',
  },
  calendar: {
    minWidth: layout.minTouch,
    minHeight: layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...typography.body,
    flexShrink: 1,
    color: colors.text,
  },
});
