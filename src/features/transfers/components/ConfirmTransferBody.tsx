import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { spacing } from '@/theme';
import { todayLocal } from '@/utils/date';

import { REJECTED_MESSAGE } from '../transferText';
import type { TransferDraft } from '../types';
import { useDuplicateNotice } from '../useDuplicateNotice';
import { useSendTransfer } from '../useSendTransfer';
import { TransferSummary } from './TransferSummary';

type ConfirmTransferBodyProps = { draft: TransferDraft };

// Resumen del borrador y las acciones para confirmarlo o volver a editarlo; mientras envía
// solo queda el botón principal, ocupado. Tras un rechazo, el aviso queda sobre las acciones.
// Si ya se envió una igual hace poco, el aviso va arriba y el botón principal pide enviar otra.
export function ConfirmTransferBody({ draft }: ConfirmTransferBodyProps) {
  const [today] = useState(todayLocal);
  const duplicate = useDuplicateNotice(draft);
  const { confirm, sending, rejectedId } = useSendTransfer(draft);
  const rejected = rejectedId !== null;

  return (
    <Screen scroll>
      <View style={duplicate ? styles.duplicate : undefined}>
        <Banner variant="warning" message={duplicate} />
      </View>
      <TransferSummary draft={draft} today={today} />
      <View style={rejected ? styles.notice : undefined}>
        <Banner variant="error" message={rejected ? REJECTED_MESSAGE : null} announceKey={rejectedId ?? 0} />
      </View>
      <View style={[styles.actions, rejected && styles.afterNotice]}>
        <Button
          label={duplicate ? 'Enviar otra igual' : 'Confirmar transferencia'}
          busy={sending}
          busyLabel="Transfiriendo…"
          onPress={() => void confirm()}
        />
        {sending ? null : <Button label="Editar datos" variant="secondary" onPress={() => router.back()} />}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  duplicate: {
    marginBottom: spacing.xl,
  },
  notice: {
    marginTop: spacing.xxl,
  },
  afterNotice: {
    marginTop: spacing.md,
  },
  actions: {
    marginTop: spacing.xxl,
    gap: spacing.sm,
  },
});
