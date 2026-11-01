import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';
import { centsToAmount } from '@/utils/amountInput';
import type { CalendarDate } from '@/utils/date';
import { formatMoney } from '@/utils/money';

import { confirmDateText, documentLabel, spokenSummary } from '../transferText';
import type { TransferDraft } from '../types';

type TransferSummaryProps = { draft: TransferDraft; today: CalendarDate };

// Todo el resumen se lee como un solo elemento con la frase hablada completa.
export function TransferSummary({ draft, today }: TransferSummaryProps) {
  const amount = formatMoney(centsToAmount(draft.cents), draft.currency);

  return (
    <View accessible accessibilityLabel={spokenSummary(draft, today)} style={styles.summary}>
      <View>
        <Text style={styles.intro}>Vas a transferir</Text>
        <Text style={styles.amount}>{amount}</Text>
      </View>
      <View style={styles.rows}>
        <SummaryRow caption="Destinatario" value={documentLabel(draft.document)} />
        <SummaryRow caption="Fecha" value={confirmDateText(draft.date, today)} />
      </View>
    </View>
  );
}

type SummaryRowProps = { caption: string; value: string };

function SummaryRow({ caption, value }: SummaryRowProps) {
  return (
    <View>
      <Text style={styles.caption}>{caption}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    gap: spacing.xl,
  },
  rows: {
    gap: spacing.md,
  },
  intro: {
    ...typography.body,
    color: colors.textSecondary,
  },
  amount: {
    ...typography.h1,
    color: colors.textStrong,
  },
  caption: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  value: {
    ...typography.label,
    color: colors.text,
  },
});
