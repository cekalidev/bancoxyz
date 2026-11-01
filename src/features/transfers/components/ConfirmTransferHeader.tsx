import { AppHeader } from '@/components/AppHeader';

import { useTransferStore } from '../transferStore';

type ConfirmTransferHeaderProps = { onBack: () => void };

// Mientras se envía la transferencia la cabecera no ofrece «Volver».
export function ConfirmTransferHeader({ onBack }: ConfirmTransferHeaderProps) {
  const sending = useTransferStore((state) => state.sending);

  return <AppHeader title="Confirmar transferencia" onBack={sending ? undefined : onBack} />;
}
