import type { ReactNode } from 'react';
import { Image, type ImageProps, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackIcon } from '@/components/icons/BackIcon';
import { colors, layout, spacing, typography } from '@/theme';

type AppHeaderProps = { right?: ReactNode; title?: string; onBack?: () => void };

type LogoA11y = Pick<ImageProps, 'accessible' | 'importantForAccessibility'>;

const DEFAULT_TITLE = 'BancoXYZ';
// Con «Volver» el logo es decorativo para que se lea primero el botón y luego el título.
const DECORATIVE_LOGO: LogoA11y = { accessible: false, importantForAccessibility: 'no-hide-descendants' };
const LABELED_LOGO: LogoA11y = { accessible: true };

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={onPress} style={styles.back}>
      <BackIcon color={colors.text} />
    </Pressable>
  );
}

export function AppHeader({ right, title = DEFAULT_TITLE, onBack }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const hasBack = onBack !== undefined;
  const logoA11y = hasBack ? DECORATIVE_LOGO : LABELED_LOGO;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.bar, hasBack ? styles.barGrows : styles.barFixed]}>
        {hasBack ? <BackButton onPress={onBack} /> : null}
        <Image
          source={require('../../assets/logo-header.png')}
          style={styles.logo}
          accessibilityLabel="BancoXYZ"
          {...logoA11y}
        />
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
  },
  barFixed: {
    height: layout.appBarHeight,
  },
  // Con fuente grande el título puede ocupar dos líneas sin cortarse.
  barGrows: {
    minHeight: layout.appBarHeight,
  },
  back: {
    width: layout.minTouch,
    height: layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: layout.headerLogoSize,
    height: layout.headerLogoSize,
  },
  title: {
    ...typography.h2,
    flex: 1,
    color: colors.text,
  },
});
