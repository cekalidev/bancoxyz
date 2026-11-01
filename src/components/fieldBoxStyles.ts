import { StyleSheet } from 'react-native';

import { borders, colors, layout, radii, spacing } from '@/theme';

export const fieldBoxStyles = StyleSheet.create({
  box: {
    minHeight: layout.inputHeight,
    borderRadius: radii.input,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rest: { borderWidth: borders.regular, borderColor: colors.border, backgroundColor: colors.background },
  focus: { borderWidth: borders.strong, borderColor: colors.focus, backgroundColor: colors.background },
  error: { borderWidth: borders.strong, borderColor: colors.error, backgroundColor: colors.background },
  disabled: {
    borderWidth: borders.regular,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
});
