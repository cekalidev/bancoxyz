import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, elevation, layout, radii } from '@/theme';

export type SheetPanelProps = { children: ReactNode };

export function SheetPanel({ children }: SheetPanelProps) {
  const insets = useSafeAreaInsets();
  const paddingBottom = insets.bottom + layout.screenPadding;

  return (
    <KeyboardAvoidingView
      accessibilityViewIsModal
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      pointerEvents="box-none"
      style={styles.avoider}
    >
      <View style={[styles.panel, { paddingBottom }]}>
        <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  avoider: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  panel: {
    maxHeight: '90%',
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    padding: layout.screenPadding,
    ...elevation.overlay,
  },
});
