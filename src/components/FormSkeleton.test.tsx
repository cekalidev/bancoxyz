import { isHiddenFromAccessibility, render, screen } from '@testing-library/react-native';
import { Animated, Dimensions, StyleSheet } from 'react-native';

import { FormSkeleton } from '@/components/FormSkeleton';
import { mockReducedMotion } from '@/test/reducedMotion';
import { colors, layout, radii, spacing, typography } from '@/theme';

const LOADING = 'Cargando…';

type Node = ReturnType<typeof screen.getByLabelText>;

async function renderForm(fields: number) {
  mockReducedMotion(true);
  await render(<FormSkeleton fields={fields} />);
}

function childrenOf(node: Node | undefined) {
  return (node?.children ?? []).filter((child): child is Node => typeof child !== 'string');
}

function styleOf(node: Node | undefined) {
  return StyleSheet.flatten(node?.props.style) ?? {};
}

function shapeOf(node: Node | undefined) {
  const { width, height, borderRadius } = styleOf(node);
  return { width, height, borderRadius };
}

// Estructura del esqueleto: el grupo anunciado, los campos (cada uno con sus tres bloques) y el botón.
function parts() {
  const group = screen.getByLabelText(LOADING);
  const [blocks] = childrenOf(group);
  const [fieldList, button] = childrenOf(blocks);
  const fields = childrenOf(fieldList);

  return { group, blocks, fieldList, fields, button };
}

afterEach(() => {
  jest.restoreAllMocks();
});

it('se anuncia como Cargando… y ocupado y oculta sus bloques al lector', async () => {
  await renderForm(3);

  const [group, ...rest] = screen.getAllByLabelText(LOADING);
  expect(rest).toHaveLength(0);
  expect(group).toHaveProp('accessible', true);
  expect(group).toBeBusy();

  const { blocks } = parts();
  expect(childrenOf(group)).toHaveLength(1);
  expect(blocks).toHaveProp('importantForAccessibility', 'no-hide-descendants');
  expect(blocks).toHaveProp('accessibilityElementsHidden', true);
  expect(isHiddenFromAccessibility(blocks)).toBe(true);
  expect(screen.queryByRole('button')).not.toBeOnTheScreen();
});

it('tiene tres bloques de campo y el del botón con sus formas', async () => {
  await renderForm(3);

  const { fontScale } = Dimensions.get('window');
  const field = [
    { width: '40%', height: typography.label.lineHeight * fontScale, borderRadius: radii.skeleton },
    { width: '100%', height: layout.inputHeight, borderRadius: radii.input },
    { width: '60%', height: typography.caption.lineHeight * fontScale, borderRadius: radii.skeleton },
  ];
  const { fields, button } = parts();

  expect(fields.map((item) => childrenOf(item).map(shapeOf))).toEqual([field, field, field]);
  expect(shapeOf(button)).toEqual({ width: '100%', height: layout.buttonHeight, borderRadius: radii.pill });
});

it('repite el bloque de campo tantas veces como campos se piden', async () => {
  await renderForm(1);

  const { fields, button } = parts();

  expect(fields).toHaveLength(1);
  expect(childrenOf(fields[0])).toHaveLength(3);
  expect(shapeOf(button).height).toBe(layout.buttonHeight);
});

it('separa la etiqueta, el campo y la ayuda, los campos entre sí y el último campo del botón', async () => {
  await renderForm(3);

  const { blocks, fieldList, fields } = parts();

  expect(styleOf(blocks)).toMatchObject({ gap: spacing.xxl });
  expect(styleOf(fieldList)).toMatchObject({ gap: spacing.md });
  expect(fields.map((item) => styleOf(item).gap)).toEqual([spacing.xs, spacing.xs, spacing.xs]);
});

it('con reducción de movimiento queda estático', async () => {
  const loop = jest.spyOn(Animated, 'loop');
  await renderForm(3);

  const { fields, button } = parts();
  const skeletons = [...fields.flatMap(childrenOf), button];

  expect(skeletons).toHaveLength(10);
  expect(skeletons.map((item) => styleOf(item).backgroundColor)).toEqual(
    skeletons.map(() => colors.skeletonBase),
  );
  expect(skeletons.map((item) => styleOf(childrenOf(item)[0]).opacity)).toEqual(skeletons.map(() => 0));
  expect(loop).not.toHaveBeenCalled();
});
