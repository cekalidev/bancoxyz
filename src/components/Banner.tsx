import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { AlertIcon } from '@/components/icons/AlertIcon';
import { InfoIcon } from '@/components/icons/InfoIcon';
import { useAnnouncement } from '@/components/useAnnouncement';
import { colors, radii, spacing, typography } from '@/theme';

type BannerVariant = 'error' | 'info' | 'warning';
type BannerActionProps = {
  label: string;
  onPress: () => void;
  busy: boolean;
  align: 'center' | 'end';
  // Texto que se ve y se anuncia mientras la acción está ocupada.
  busyLabel?: string;
};
type BannerProps = {
  variant: BannerVariant;
  message: string | null;
  action?: BannerActionProps;
  // Cambia con cada aviso nuevo para volver a anunciarlo aunque el texto se repita.
  announceKey?: number;
};

const tones = {
  error: { Icon: AlertIcon, background: colors.errorBg, text: colors.error },
  info: { Icon: InfoIcon, background: colors.infoBg, text: colors.info },
  warning: { Icon: AlertIcon, background: colors.warningBg, text: colors.warning },
} as const;

export function Banner({ variant, message, action, announceKey }: BannerProps) {
  const { Icon, background, text } = tones[variant];

  useAnnouncement(message, announceKey);

  // El contenedor y la región quedan montados aunque no haya mensaje: así la región
  // existe antes de que aparezca el aviso y, vacíos, no ocupan espacio.
  return (
    <View style={message ? [styles.box, { backgroundColor: background }] : undefined}>
      <View accessibilityLiveRegion="polite">
        {message ? (
          <View style={styles.row}>
            <Icon color={text} />
            <Text style={[styles.message, { color: text }]}>{message}</Text>
          </View>
        ) : null}
      </View>
      {/* La acción queda fuera de la región: su estado ocupado no vuelve a leer el aviso. */}
      {message && action ? <BannerAction {...action} /> : null}
    </View>
  );
}

function BannerAction({ label, onPress, busy, align, busyLabel }: BannerActionProps) {
  return (
    <View style={[styles.action, align === 'center' ? styles.center : styles.end]}>
      <Button
        variant="secondary"
        label={label}
        onPress={onPress}
        busy={busy}
        busyLabel={busyLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    padding: spacing.md,
    borderRadius: radii.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  message: {
    ...typography.body,
    flex: 1,
  },
  action: {
    marginTop: spacing.sm,
  },
  center: {
    alignSelf: 'center',
  },
  end: {
    alignSelf: 'flex-end',
  },
});
