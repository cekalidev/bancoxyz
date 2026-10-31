import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { layout, spacing } from '@/theme';

import { useNavigateOnce } from '../useNavigateOnce';

// Los dos accesos están siempre disponibles, también mientras el saldo carga.
export function HomeActions() {
  const navigateOnce = useNavigateOnce();

  return (
    <View style={styles.actions}>
      <Button label="Nueva transferencia" onPress={() => navigateOnce('/nueva-transferencia')} />
      <Button
        label="Ver transferencias"
        variant="secondary"
        onPress={() => navigateOnce('/transferencias')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    marginTop: layout.sectionGap,
    gap: spacing.sm,
  },
});
