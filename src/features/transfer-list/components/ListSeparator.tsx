import { StyleSheet, View } from 'react-native';

import { borders, colors } from '@/theme';

// Línea fina entre filas del listado.
export function ListSeparator() {
  return <View style={styles.line} />;
}

const styles = StyleSheet.create({
  line: {
    height: borders.regular,
    backgroundColor: colors.borderSubtle,
  },
});
