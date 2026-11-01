import { StyleSheet, View } from 'react-native';

import { Banner } from '@/components/Banner';
import { spacing } from '@/theme';

import { CounterRow } from './CounterRow';
import { ListSeparator } from './ListSeparator';

export type RefreshNotice = { message: string | null; errorId: number; retrying: boolean; retry: () => void };

type ListTopProps = { notice: RefreshNotice; counter: string; showClear: boolean; onClear: () => void };

// Aviso de una recarga fallida, con aire debajo solo si se ve. Queda siempre montado
// para que su región exista antes de que aparezca.
export function RefreshBanner({ notice }: { notice: RefreshNotice }) {
  return (
    <View style={notice.message ? styles.notice : undefined}>
      <Banner
        variant="error"
        message={notice.message}
        announceKey={notice.errorId}
        action={{
          label: 'Reintentar',
          busyLabel: 'Reintentando…',
          onPress: notice.retry,
          busy: notice.retrying,
          align: 'end',
        }}
      />
    </View>
  );
}

// Cabecera de la lista: el aviso de la recarga encima del contador y la línea que lo separa de las filas.
export function ListTop({ notice, counter, showClear, onClear }: ListTopProps) {
  return (
    <View style={styles.top}>
      <RefreshBanner notice={notice} />
      <CounterRow text={counter} showClear={showClear} onClear={onClear} />
      <ListSeparator />
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    marginTop: spacing.md,
  },
  notice: {
    marginBottom: spacing.md,
  },
});
