import { isHiddenFromAccessibility, render } from '@testing-library/react-native';
import type { ComponentType } from 'react';
import { processColor } from 'react-native';

import { AlertIcon } from '@/components/icons/AlertIcon';
import { BackIcon } from '@/components/icons/BackIcon';
import { EyeIcon } from '@/components/icons/EyeIcon';
import { EyeOffIcon } from '@/components/icons/EyeOffIcon';
import { InfoIcon } from '@/components/icons/InfoIcon';
import { colors, layout } from '@/theme';

type IconComponent = ComponentType<{ color: string; size?: number }>;
type Observed = Awaited<ReturnType<typeof observeIcons>>;

const GRID = 24;
const CUSTOM_SIZE = 32;

const icons: [string, IconComponent][] = [
  ['EyeIcon', EyeIcon],
  ['EyeOffIcon', EyeOffIcon],
  ['AlertIcon', AlertIcon],
  ['InfoIcon', InfoIcon],
  ['BackIcon', BackIcon],
];

async function observeIcons(size?: number) {
  const observed = [];

  for (const [name, Icon] of icons) {
    const { root, unmount } = await render(<Icon color={colors.error} size={size} />);
    const nodes = root ? [root, ...root.queryAll(() => true)] : [];

    observed.push({
      name,
      props: root?.props ?? {},
      hidden: isHiddenFromAccessibility(root),
      strokes: nodes.map((node) => node.props.stroke).filter((stroke) => stroke !== undefined),
    });
    await unmount();
  }

  return observed;
}

function accessibilityOf(observed: Observed) {
  return observed.map(({ name, props, hidden }) => ({
    name,
    accessible: props.accessible,
    importantForAccessibility: props.importantForAccessibility,
    hidden,
  }));
}

function geometryOf(observed: Observed) {
  return observed.map(({ name, props }) => ({
    name,
    width: props.width,
    height: props.height,
    vbWidth: props.vbWidth,
    vbHeight: props.vbHeight,
  }));
}

function expectedGeometry(size: number) {
  return icons.map(([name]) => ({ name, width: size, height: size, vbWidth: GRID, vbHeight: GRID }));
}

describe('iconos', () => {
  it('los iconos son decorativos y no se anuncian', async () => {
    expect(accessibilityOf(await observeIcons())).toEqual(
      icons.map(([name]) => ({
        name,
        accessible: false,
        importantForAccessibility: 'no-hide-descendants',
        hidden: true,
      })),
    );
  });

  it('miden por defecto el tamaño de icono del tema sobre una cuadrícula de 24', async () => {
    expect(geometryOf(await observeIcons())).toEqual(expectedGeometry(layout.iconSize));
  });

  it('admiten otro tamaño sin cambiar la cuadrícula', async () => {
    expect(geometryOf(await observeIcons(CUSTOM_SIZE))).toEqual(expectedGeometry(CUSTOM_SIZE));
  });

  it('dibujan sus trazos con el color indicado', async () => {
    const expectedPayload = processColor(colors.error);
    const observed = await observeIcons();

    expect(
      observed.map(({ name, strokes }) => ({
        name,
        colored: strokes.some((stroke) => stroke.payload === expectedPayload),
      })),
    ).toEqual(icons.map(([name]) => ({ name, colored: true })));
  });
});
