import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/Screen';
import { colors, layout, spacing, typography } from '@/theme';

export function NotFoundScreen() {
  return (
    <Screen>
      <Text accessibilityRole="header" style={styles.title}>
        Esta pantalla no existe
      </Text>
      <Link href="/" replace asChild>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Volver al inicio"
          style={styles.link}
        >
          <Text style={styles.linkText}>Volver al inicio</Text>
        </Pressable>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.md,
  },
  link: {
    minHeight: layout.minTouch,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
  },
  linkText: {
    ...typography.button,
    color: colors.textStrong,
  },
});
