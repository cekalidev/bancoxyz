import { render, screen, within } from '@testing-library/react-native';
import { AccessibilityInfo, Platform, processColor, StyleSheet } from 'react-native';

import { Banner } from '@/components/Banner';
import { AlertIcon } from '@/components/icons/AlertIcon';
import { InfoIcon } from '@/components/icons/InfoIcon';
import { colors, radii, spacing, typography } from '@/theme';

const MESSAGE = 'Correo o contraseña incorrectos.';
const EXPIRED_MESSAGE = 'Tu sesión expiró. Inicia sesión de nuevo.';

type Node = ReturnType<typeof getRegion>;

function spyOnAnnouncements() {
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  announce.mockClear();
  return announce;
}

function getRegion() {
  const regions = screen.container.queryAll((node) => node.props.accessibilityLiveRegion === 'polite');

  expect(regions).toHaveLength(1);
  return regions[0];
}

function pathsOf(node: Node) {
  return node.queryAll((child) => typeof child.props.d === 'string').map((child) => child.props.d);
}

function strokeColorsOf(node: Node) {
  return node.queryAll((child) => child.props.stroke !== undefined).map((child) => child.props.stroke.payload);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Banner región', () => {
  it('el aviso vive en una región que se anuncia y se anuncia en iOS al aparecer', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const announce = spyOnAnnouncements();
    await render(<Banner variant="error" message={null} />);
    const region = getRegion();

    expect(announce).not.toHaveBeenCalled();

    await screen.rerender(<Banner variant="error" message={MESSAGE} />);

    expect(getRegion()).toBe(region);
    expect(within(region).getByText(MESSAGE)).toBeOnTheScreen();
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith(MESSAGE);
  });

  it.each(['error', 'info'] as const)(
    'sin mensaje el aviso %s deja su región vacía y sin altura, margen ni relleno',
    async (variant) => {
      await render(<Banner variant={variant} message={null} />);
      const region = getRegion();
      const boxKeys = Object.keys(StyleSheet.flatten(region.props.style) ?? {}).filter((key) =>
        /^(height|minHeight|margin|padding|gap)/.test(key),
      );

      expect(region).toBeEmptyElement();
      expect(boxKeys).toEqual([]);
    },
  );
});

describe('Banner anuncio en Android', () => {
  it('en Android el aviso se lee por su región y no se anuncia a mano', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const announce = spyOnAnnouncements();
    await render(<Banner variant="error" message={null} />);
    await screen.rerender(<Banner variant="error" message={MESSAGE} />);

    expect(within(getRegion()).getByText(MESSAGE)).toBeOnTheScreen();
    expect(announce).not.toHaveBeenCalled();
  });
});

describe('Banner anuncio en iOS', () => {
  it('anuncia el aviso que ya está al montar y no lo repite mientras el mensaje no cambie', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const announce = spyOnAnnouncements();
    await render(<Banner variant="info" message={EXPIRED_MESSAGE} />);

    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenLastCalledWith(EXPIRED_MESSAGE);

    await screen.rerender(<Banner variant="info" message={EXPIRED_MESSAGE} />);

    expect(announce).toHaveBeenCalledTimes(1);

    await screen.rerender(<Banner variant="info" message={MESSAGE} />);

    expect(announce).toHaveBeenCalledTimes(2);
    expect(announce).toHaveBeenLastCalledWith(MESSAGE);
  });

  it('vuelve a anunciar el mismo mensaje si el aviso pasó por vacío', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const announce = spyOnAnnouncements();
    await render(<Banner variant="error" message={MESSAGE} />);
    await screen.rerender(<Banner variant="error" message={null} />);

    expect(announce).toHaveBeenCalledTimes(1);

    await screen.rerender(<Banner variant="error" message={MESSAGE} />);

    expect(announce).toHaveBeenCalledTimes(2);
    expect(announce).toHaveBeenLastCalledWith(MESSAGE);
  });
});

const variants = [
  { variant: 'error', Icon: AlertIcon, background: colors.errorBg, text: colors.error },
  { variant: 'info', Icon: InfoIcon, background: colors.infoBg, text: colors.info },
  { variant: 'warning', Icon: AlertIcon, background: colors.warningBg, text: colors.warning },
] as const;

async function pathsOfIcon(Icon: typeof AlertIcon) {
  const { root, unmount } = await render(<Icon color={colors.text} />);
  const paths = root ? pathsOf(root) : [];

  await unmount();
  return paths;
}

describe('Banner variantes', () => {
  it.each(variants)('el aviso $variant muestra su icono, su fondo y su texto', async (tone) => {
    const iconPaths = await pathsOfIcon(tone.Icon);
    await render(<Banner variant={tone.variant} message={MESSAGE} />);
    const region = getRegion();
    const row = screen.getByText(MESSAGE).parent;

    expect(row?.parent).toBe(region);
    expect(row).toHaveStyle({ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs });
    expect(region.parent).toHaveStyle({
      padding: spacing.md,
      borderRadius: radii.md,
      backgroundColor: tone.background,
    });
    expect(screen.getByText(MESSAGE)).toHaveStyle({ ...typography.body, flex: 1, color: tone.text });
    expect(pathsOf(region)).toEqual(iconPaths);
    expect(strokeColorsOf(region)).toContain(processColor(tone.text));
  });
});
