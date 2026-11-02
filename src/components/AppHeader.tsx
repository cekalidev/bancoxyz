import type { ReactNode } from 'react';
import { Image, type ImageProps, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hiddenFromReader } from '@/components/hiddenFromReader';
import { BackIcon } from '@/components/icons/BackIcon';
import { colors, layout, spacing, typography } from '@/theme';

type AppHeaderProps = { right?: ReactNode; title?: string; onBack?: () => void };

type LogoA11y = Pick<ImageProps, 'accessible' | 'accessibilityRole' | 'importantForAccessibility'>;

const BRAND_TITLE = 'BancoXYZ';
// Con «Volver» el logo es decorativo para que se lea primero el botón y luego el título.
const DECORATIVE_LOGO: LogoA11y = { accessible: false, importantForAccessibility: 'no-hide-descendants' };
const LABELED_LOGO: LogoA11y = { accessible: true };
// Con el título de la marca el logo ya dice «BancoXYZ»: se anuncia como imagen y el título no se repite.
const BRAND_LOGO: LogoA11y = { accessible: true, accessibilityRole: 'image' };
const HEADER_TITLE = { accessibilityRole: 'header' } as const;

function logoA11yFor(isBrand: boolean, hasBack: boolean) {
  if (isBrand) return BRAND_LOGO;
  return hasBack ? DECORATIVE_LOGO : LABELED_LOGO;
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={onPress} style={styles.back}>
      <BackIcon color={colors.text} />
    </Pressable>
  );
}

export function AppHeader({ right, title = BRAND_TITLE, onBack }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const hasBack = onBack !== undefined;
  const isBrand = title === BRAND_TITLE;
  const logoA11y = logoA11yFor(isBrand, hasBack);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        {hasBack ? <BackButton onPress={onBack} /> : null}
        <Image
          source={require('../../assets/logo-header.png')}
          style={styles.logo}
          accessibilityLabel="BancoXYZ"
          {...logoA11y}
        />
        <Text {...(isBrand ? hiddenFromReader : HEADER_TITLE)} style={styles.title}>
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
  // Con fuente grande el título puede ocupar dos líneas sin cortarse: la barra crece desde su alto mínimo.
  bar: {
    minHeight: layout.appBarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
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
