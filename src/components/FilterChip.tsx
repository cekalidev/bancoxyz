import { LinearGradient } from 'expo-linear-gradient';
import type { Ref } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { PressableInstance } from 'react-native';

import { CheckIcon } from '@/components/icons/CheckIcon';
import { ChevronDownIcon } from '@/components/icons/ChevronDownIcon';
import { colors, fonts, gradients, layout, radii, spacing, typography } from '@/theme';

export type FilterChipProps = {
  text: string;
  spokenLabel: string;
  selected: boolean;
  onPress: () => void;
  chipRef?: Ref<PressableInstance>;
};

const HIT_SLOP = { top: spacing.xxs, bottom: spacing.xxs };

export function FilterChip({ text, spokenLabel, selected, onPress, chipRef }: FilterChipProps) {
  const contentColor = selected ? colors.text : colors.chipText;

  return (
    <Pressable
      ref={chipRef}
      accessibilityRole="button"
      accessibilityLabel={spokenLabel}
      accessibilityHint="Abre el filtro"
      accessibilityState={{ selected }}
      hitSlop={HIT_SLOP}
      onPress={onPress}
      style={[styles.chip, !selected && styles.chipIdle]}
    >
      {selected && (
        <LinearGradient testID="filter-chip-gradient" {...gradients.accentSoft} style={StyleSheet.absoluteFill} />
      )}
      {selected && <CheckIcon color={contentColor} />}
      <Text style={[typography.body, selected ? styles.textApplied : styles.textIdle]}>{text}</Text>
      {!selected && <ChevronDownIcon color={contentColor} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: layout.chipHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  chipIdle: {
    backgroundColor: colors.surfaceMuted,
  },
  textIdle: {
    color: colors.chipText,
  },
  textApplied: {
    fontFamily: fonts.bodyBold,
    color: colors.text,
  },
});
