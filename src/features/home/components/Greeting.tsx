import { StyleSheet, Text } from 'react-native';

import { colors, spacing, typography } from '@/theme';

import { greetingFor } from '../greeting';

type GreetingProps = { name: string };

// Sin límite de líneas: el nombre completo se ve siempre, aunque ocupe varias.
export function Greeting({ name }: GreetingProps) {
  return (
    <Text accessibilityRole="header" style={styles.greeting}>
      {greetingFor(name)}
    </Text>
  );
}

const styles = StyleSheet.create({
  greeting: {
    ...typography.h2,
    color: colors.textStrong,
    marginBottom: spacing.xl,
  },
});
