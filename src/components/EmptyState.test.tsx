import {
  isHiddenFromAccessibility,
  render,
  screen,
  userEvent,
  within,
} from '@testing-library/react-native';
import { createRef, type ComponentProps } from 'react';
import { processColor, type TextInstance } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { ListIcon } from '@/components/icons/ListIcon';
import { SearchIcon } from '@/components/icons/SearchIcon';
import { colors, layout, spacing, typography } from '@/theme';

const TITLE = 'Sin resultados para estos filtros';
const TEXT = 'Prueba con otro nombre, valor o fecha';
const LABEL = 'Limpiar filtros';

type IconComponent = typeof SearchIcon;

function emptyState(props: Partial<ComponentProps<typeof EmptyState>> = {}) {
  return <EmptyState Icon={SearchIcon} title={TITLE} text={TEXT} {...props} />;
}

// Nodos del icono dibujado: el contenedor del svg y los trazos que lo forman.
function iconNodes() {
  return screen.container.queryAll((node) => node.props.vbWidth !== undefined);
}

function pathsIn(nodes: ReturnType<typeof iconNodes>) {
  return nodes.flatMap((node) =>
    node.queryAll((child) => typeof child.props.d === 'string').map((child) => child.props.d),
  );
}

async function pathsOfIcon(Icon: IconComponent) {
  const { unmount } = await render(<Icon color={colors.text} size={layout.resultIconSize} />);
  const paths = pathsIn(iconNodes());

  await unmount();
  return paths;
}

function expectDecorativeIcon(expectedPaths: string[]) {
  const icons = iconNodes();

  expect(icons).toHaveLength(1);

  const [icon] = icons;

  expect(icon).toHaveProp('width', layout.resultIconSize);
  expect(icon).toHaveProp('height', layout.resultIconSize);
  expect(isHiddenFromAccessibility(icon)).toBe(true);
  expect(pathsIn([icon])).toEqual(expectedPaths);
  expect(
    icon.queryAll((child) => child.props.stroke?.payload === processColor(colors.textSecondary)),
  ).not.toHaveLength(0);
}

function expectTexts() {
  expect(screen.getByRole('header', { name: TITLE })).toHaveStyle({
    ...typography.h2,
    color: colors.textStrong,
    textAlign: 'center',
  });
  expect(screen.getByText(TEXT)).toHaveStyle({
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  });
}

function expectCenteredStack() {
  expect(screen.root).toHaveStyle({ alignItems: 'center', gap: spacing.xs });
}

function expectContent(expectedPaths: string[]) {
  expectDecorativeIcon(expectedPaths);
  expectTexts();
  expectCenteredStack();
}

async function expectPrimaryAction(onPress: jest.Mock) {
  const button = screen.getByRole('button', { name: LABEL });

  expect(within(button).getByTestId('button-gradient')).toBeOnTheScreen();
  expect(button.parent).toHaveStyle({ alignSelf: 'stretch', marginTop: spacing.xl });

  await userEvent.press(button);
  expect(onPress).toHaveBeenCalledTimes(1);
}

async function expectSecondaryAction(onPress: jest.Mock) {
  const button = screen.getByRole('button', { name: LABEL });

  expect(button).toHaveStyle({ backgroundColor: colors.surfaceMuted });
  expect(within(button).queryByTestId('button-gradient')).not.toBeOnTheScreen();
  expect(button.parent).toHaveStyle({ alignSelf: 'stretch', marginTop: spacing.xl });

  await userEvent.press(button);
  expect(onPress).toHaveBeenCalledTimes(1);
}

type NodeWithProps = { props: { accessibilityRole?: string; children?: unknown } };

function isNodeWithProps(node: unknown): node is NodeWithProps {
  return typeof node === 'object' && node !== null && 'props' in node;
}

it('muestra el icono decorativo, el encabezado, el texto y su acción', async () => {
  const listPaths = await pathsOfIcon(ListIcon);
  const searchPaths = await pathsOfIcon(SearchIcon);
  const onPrimary = jest.fn();
  const onSecondary = jest.fn();

  // Acción principal: el icono llega por props y la píldora lleva degradado.
  await render(
    emptyState({ Icon: ListIcon, action: { label: LABEL, variant: 'primary', onPress: onPrimary } }),
  );
  expectContent(listPaths);
  await expectPrimaryAction(onPrimary);

  // Acción secundaria: sin degradado, fondo gris claro.
  await screen.rerender(
    emptyState({ Icon: SearchIcon, action: { label: LABEL, variant: 'secondary', onPress: onSecondary } }),
  );
  expectContent(searchPaths);
  await expectSecondaryAction(onSecondary);

  // Sin acción solo quedan icono, encabezado y texto.
  await screen.rerender(emptyState());
  expectContent(searchPaths);
  expect(screen.queryByRole('button')).not.toBeOnTheScreen();
});

it('el título del vacío es encabezado', async () => {
  const titleRef = createRef<TextInstance>();
  await render(emptyState({ titleRef }));

  const headings = screen.getAllByRole('header');
  expect(headings).toHaveLength(1);
  expect(headings[0]).toHaveTextContent(TITLE);

  const { current } = titleRef;
  expect(isNodeWithProps(current) ? current.props : undefined).toEqual(
    expect.objectContaining({ accessibilityRole: 'header', children: TITLE }),
  );
});
