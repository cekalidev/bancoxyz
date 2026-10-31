import { StyleSheet, View } from 'react-native';

import { Banner } from '@/components/Banner';
import { spacing } from '@/theme';

import type { BalanceModel } from '../useBalance';
import type { BalanceVisibility } from '../useBalanceVisibility';
import { BalanceCard } from './BalanceCard';
import { BalanceCardSkeleton } from './BalanceCardSkeleton';

type BalanceSectionProps = { balance: BalanceModel; visibility: BalanceVisibility };

// El aviso queda siempre montado para que su región exista antes de que aparezca el error.
// Con cifra, el aviso va encima de la tarjeta y su acción se alinea al final.
export function BalanceSection({ balance, visibility }: BalanceSectionProps) {
  const { message, errorId, retry, retrying, view } = balance;
  const align = view === 'card' ? 'end' : 'center';
  return (
    <>
      <Banner
        variant="error"
        message={message}
        announceKey={errorId}
        action={{
          label: 'Reintentar',
          busyLabel: 'Reintentando…',
          onPress: retry,
          busy: retrying,
          align,
        }}
      />
      <BalanceContent balance={balance} visibility={visibility} />
    </>
  );
}

// Tarjeta con cifra, nada si el aviso ocupa su lugar y skeleton mientras llega.
function BalanceContent({ balance, visibility }: BalanceSectionProps) {
  const { view, balance: data, cardRef, message } = balance;
  if (view === 'card' && data !== undefined) {
    return (
      <View style={message ? styles.belowNotice : undefined}>
        <BalanceCard
          balance={data}
          cardRef={cardRef}
          hidden={visibility.hidden}
          onToggleHidden={visibility.toggle}
        />
      </View>
    );
  }
  if (view === 'error') return null;
  return <BalanceCardSkeleton />;
}

const styles = StyleSheet.create({
  belowNotice: {
    marginTop: spacing.md,
  },
});
