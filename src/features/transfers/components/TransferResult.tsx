import { useEffect, useRef } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View, type TextInstance } from 'react-native';

import { Button } from '@/components/Button';
import { AlertIcon } from '@/components/icons/AlertIcon';
import { SuccessIcon } from '@/components/icons/SuccessIcon';
import { useAnnouncement } from '@/components/useAnnouncement';
import { colors, layout, spacing, typography } from '@/theme';

import { resultTexts, type ResultLine } from '../resultText';
import type { TransferAttempt } from '../types';

const tones = {
  success: { Icon: SuccessIcon, color: colors.success },
  warning: { Icon: AlertIcon, color: colors.warning },
} as const;

type TransferResultProps = { attempt: TransferAttempt; onHome: () => void };

// El estado se distingue por icono y título; el icono es solo decorativo.
// El título recibe el foco al montar y se anuncia: a mano en iOS y por su región en Android.
export function TransferResult({ attempt, onHome }: TransferResultProps) {
  const { tone, title, lines } = resultTexts(attempt);
  const { Icon, color } = tones[tone];
  const titleRef = useRef<TextInstance>(null);

  useAnnouncement(title);
  useEffect(() => {
    if (titleRef.current) AccessibilityInfo.sendAccessibilityEvent(titleRef.current, 'focus');
  }, []);

  return (
    <View style={styles.result}>
      <View style={styles.content}>
        <Icon color={color} size={layout.resultIconSize} />
        <View style={styles.text}>
          <Text
            ref={titleRef}
            accessibilityRole="header"
            accessibilityLiveRegion="polite"
            style={styles.title}
          >
            {title}
          </Text>
          <ResultLines lines={lines} />
        </View>
      </View>
      <Button label="Volver al inicio" onPress={onHome} />
    </View>
  );
}

function ResultLines({ lines }: { lines: ResultLine[] }) {
  const firstData = lines.findIndex((line) => line.kind === 'label');

  return lines.map((line, index) => (
    <Text
      key={line.text}
      accessibilityLabel={line.spoken}
      style={line.kind === 'label' ? [styles.data, index === firstData && styles.dataStart] : styles.line}
    >
      {line.text}
    </Text>
  ));
}

const styles = StyleSheet.create({
  // Con el padding de la pantalla (20) deja 32 dp bajo la cabecera.
  result: {
    gap: spacing.xxl,
    paddingTop: spacing.sm,
  },
  content: {
    gap: spacing.md,
  },
  text: {
    gap: spacing.xs,
  },
  title: {
    ...typography.h2,
    color: colors.textStrong,
  },
  line: {
    ...typography.body,
    color: colors.text,
  },
  data: {
    ...typography.label,
    color: colors.text,
  },
  dataStart: {
    marginTop: spacing.sm,
  },
});
