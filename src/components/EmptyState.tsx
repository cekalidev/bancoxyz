import type { ComponentType, Ref } from 'react';
import { StyleSheet, Text, View, type TextInstance } from 'react-native';

import { Button } from '@/components/Button';
import { colors, layout, spacing, typography } from '@/theme';

type EmptyStateAction = {
  label: string;
  variant: 'primary' | 'secondary';
  onPress: () => void;
};

type EmptyStateProps = {
  Icon: ComponentType<{ color: string; size?: number }>;
  title: string;
  text: string;
  action?: EmptyStateAction;
  titleRef?: Ref<TextInstance>;
};

export function EmptyState({ Icon, title, text, action, titleRef }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Icon color={colors.textSecondary} size={layout.resultIconSize} />
      <Text ref={titleRef} accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.text}>{text}</Text>
      {action && (
        <View style={styles.action}>
          <Button label={action.label} variant={action.variant} onPress={action.onPress} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    ...typography.h2,
    color: colors.textStrong,
    textAlign: 'center',
  },
  text: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  action: {
    alignSelf: 'stretch',
    marginTop: spacing.xl,
  },
});
