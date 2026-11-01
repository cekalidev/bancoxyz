import type { Ref } from 'react';
import type { TextInstance } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { ListIcon } from '@/components/icons/ListIcon';
import { useNavigateOnce } from '@/hooks/useNavigateOnce';

import { NEW_TRANSFER_LABEL, NO_TRANSFERS_TEXT, NO_TRANSFERS_TITLE } from '../listText';

type NoTransfersProps = { titleRef?: Ref<TextInstance> };

// Vacío sin datos: no hay nada que filtrar, solo invitar a hacer la primera transferencia.
export function NoTransfers({ titleRef }: NoTransfersProps) {
  const navigateOnce = useNavigateOnce();

  return (
    <EmptyState
      Icon={ListIcon}
      title={NO_TRANSFERS_TITLE}
      text={NO_TRANSFERS_TEXT}
      titleRef={titleRef}
      action={{
        label: NEW_TRANSFER_LABEL,
        variant: 'primary',
        onPress: () => navigateOnce('/nueva-transferencia'),
      }}
    />
  );
}
