import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout } from '@/theme';

type ScreenProps = { children: ReactNode; scroll?: boolean };

export function Screen({ children, scroll = false }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const paddingBottom = insets.bottom + layout.screenPadding;

  // Sin refreshControl: la pantalla no se recarga al deslizar hacia abajo.
  if (scroll) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom }]}>
        {children}
      </ScrollView>
    );
  }

  return <View style={[styles.container, { paddingBottom }]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: layout.screenPadding,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    padding: layout.screenPadding,
  },
});
