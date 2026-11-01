import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { useChangeAnnouncement } from '@/components/useChangeAnnouncement';
import { colors, layout, spacing, typography } from '@/theme';

import { CLEAR_FILTERS_LABEL } from '../listText';

type CounterRowProps = {
  text: string;
  showClear: boolean;
  onClear: () => void;
};

// Contador de transferencias con «Limpiar filtros» a su lado. Recibe siempre el texto ya calculado:
// un texto de partida que cambiara después se anunciaría en iOS en la primera carga.
export function CounterRow({ text, showClear, onClear }: CounterRowProps) {
  useChangeAnnouncement(text);

  return (
    <View style={styles.row}>
      <Text accessibilityLiveRegion="polite" style={styles.counter}>
        {text}
      </Text>
      {showClear ? <Button variant="ghost" label={CLEAR_FILTERS_LABEL} onPress={onClear} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: spacing.sm,
    // Mismo alto con y sin «Limpiar filtros»: la lista no salta al aparecer el botón.
    minHeight: layout.minTouch,
  },
  counter: {
    ...typography.caption,
    color: colors.textSecondary,
    flexShrink: 1,
  },
});
