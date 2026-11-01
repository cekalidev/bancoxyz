import { Banner } from '@/components/Banner';
import { FormSkeleton } from '@/components/FormSkeleton';
import { Screen } from '@/components/Screen';

import { TransferForm } from '../components/TransferForm';
import { useFormBalance } from '../useFormBalance';

// Sin saldo no hay formulario: skeleton mientras llega o el aviso con Reintentar.
// El aviso queda siempre montado para que su región exista antes de que aparezca el error.
export function NewTransferScreen() {
  const { view, data, message, errorId, retrying, retry } = useFormBalance();

  if (view === 'card' && data !== undefined) return <TransferForm balance={data} />;

  return (
    <Screen scroll>
      <Banner
        variant="error"
        message={message}
        announceKey={errorId}
        action={{ label: 'Reintentar', onPress: retry, busy: retrying, align: 'center' }}
      />
      {view === 'skeleton' ? <FormSkeleton fields={3} /> : null}
    </Screen>
  );
}
