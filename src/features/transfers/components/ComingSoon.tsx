import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

// Contenido provisional de las secciones que aún no existen: un encabezado y una línea, sin acciones.
export function ComingSoon() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        Disponible pronto
      </Text>
      <Text style={styles.text}>Esta sección estará lista en breve.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  text: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
