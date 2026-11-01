import { StyleSheet, Text } from 'react-native';

import { colors, spacing, typography } from '@/theme';

export type FieldHintProps = { text: string; spoken?: string };

export function FieldHint({ text, spoken }: FieldHintProps) {
  return (
    <Text accessible accessibilityLabel={spoken} style={styles.hint}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
