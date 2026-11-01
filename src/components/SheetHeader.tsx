import type { RefObject } from 'react';
import { StyleSheet, Text, View, type TextInstance } from 'react-native';

import { ClearButton } from '@/components/ClearButton';
import { colors, spacing, typography } from '@/theme';

export type SheetHeaderProps = {
  title: string;
  closeLabel: string;
  onClose: () => void;
  titleRef?: RefObject<TextInstance | null>;
};

export function SheetHeader({ title, closeLabel, onClose, titleRef }: SheetHeaderProps) {
  return (
    <View style={styles.header}>
      <Text ref={titleRef} accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <ClearButton label={closeLabel} onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.textStrong,
    flex: 1,
  },
});
