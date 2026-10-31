import { StyleSheet, Text, View } from 'react-native';

import { AlertIcon } from '@/components/icons/AlertIcon';
import { useAnnouncement } from '@/components/useAnnouncement';
import { colors, spacing, typography } from '@/theme';

type FieldErrorProps = { message?: string };

export function FieldError({ message }: FieldErrorProps) {
  useAnnouncement(message ?? null);

  return (
    <View accessibilityLiveRegion="polite">
      {message ? (
        <View style={styles.row}>
          <AlertIcon color={colors.error} />
          <Text style={styles.message}>{message}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  message: {
    ...typography.caption,
    flex: 1,
    color: colors.error,
  },
});
