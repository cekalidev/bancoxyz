import { StyleSheet, Text, View } from 'react-native';

import { ClockIcon } from '@/components/icons/ClockIcon';
import { colors, layout, spacing, typography } from '@/theme';

import type { TransferRow } from '../types';

type TransferListItemProps = {
  row: TransferRow;
};

export function TransferListItem({ row }: TransferListItemProps) {
  return (
    <View accessible accessibilityLabel={row.spokenLabel} style={styles.item}>
      <View style={styles.topRow}>
        <Text style={styles.name}>{row.name}</Text>
        <Text style={styles.amount}>{row.amount}</Text>
      </View>
      <Text style={styles.detail}>{row.detail}</Text>
      {row.scheduled ? <ScheduledMarker /> : null}
    </View>
  );
}

function ScheduledMarker() {
  return (
    <View style={styles.scheduled}>
      <ClockIcon color={colors.info} />
      <Text style={styles.scheduledLabel}>Programada</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    minHeight: layout.listItemMinHeight,
    paddingVertical: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.sm,
  },
  name: {
    ...typography.label,
    color: colors.text,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '55%',
  },
  amount: {
    ...typography.amount,
    color: colors.text,
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
    marginLeft: 'auto',
    textAlign: 'right',
  },
  detail: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  scheduled: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xxs,
  },
  scheduledLabel: {
    ...typography.caption,
    color: colors.info,
  },
});
