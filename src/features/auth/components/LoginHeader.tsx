import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, layout, spacing, typography } from '@/theme';

export function LoginHeader() {
  return (
    <View style={styles.row}>
      <Image
        source={require('../../../../assets/logo-header.png')}
        style={styles.logo}
        accessible
        accessibilityLabel="BancoXYZ"
      />
      <View style={styles.texts}>
        <Text accessibilityRole="header" style={styles.title}>
          Hola de nuevo
        </Text>
        <Text style={styles.subtitle}>Inicia sesión para continuar en BancoXYZ</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  logo: {
    width: layout.loginLogoSize,
    height: layout.loginLogoSize,
  },
  texts: {
    flex: 1,
  },
  title: {
    ...typography.h1,
    color: colors.textStrong,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
