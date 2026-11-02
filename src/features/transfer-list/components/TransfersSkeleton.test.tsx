import { isHiddenFromAccessibility, render, screen } from '@testing-library/react-native';
import { Animated, Dimensions, StyleSheet } from 'react-native';

import { mockReducedMotion } from '@/test/reducedMotion';
import { colors, layout, radii, spacing, typography } from '@/theme';

import { TransfersSkeleton } from './TransfersSkeleton';

const LOADING = 'Cargando…';

type Node = ReturnType<typeof screen.getByLabelText>;

async function renderSkeleton() {
  mockReducedMotion(true);
  await render(<TransfersSkeleton />);
}

function childrenOf(node: Node | undefined) {
  return (node?.children ?? []).filter((child): child is Node => typeof child !== 'string');
}

afterEach(() => {
  jest.restoreAllMocks();
});

it('se anuncia como Cargando… y ocupado y oculta sus bloques al lector', async () => {
  await renderSkeleton();

  const [group, ...rest] = screen.getAllByLabelText(LOADING);
  expect(rest).toHaveLength(0);
  expect(group).toHaveProp('accessible', true);
  expect(group).toBeBusy();

  const [blocks, ...others] = childrenOf(group);
  expect(others).toHaveLength(0);
  expect(blocks).toHaveProp('importantForAccessibility', 'no-hide-descendants');
  expect(blocks).toHaveProp('accessibilityElementsHidden', true);
  expect(isHiddenFromAccessibility(blocks)).toBe(true);
  expect(screen.queryByRole('progressbar')).not.toBeOnTheScreen();
  expect(screen.queryByRole('button')).not.toBeOnTheScreen();
});

function styleOf(node: Node | undefined) {
  return StyleSheet.flatten(node?.props.style) ?? {};
}

function shapeOf(node: Node | undefined) {
  const { width, height, borderRadius } = styleOf(node);
  return { width, height, borderRadius };
}

// La línea de 1 dp que separa las filas, como en la lista real.
function isSeparator(node: Node) {
  return styleOf(node).height === 1;
}

function rowParts(row: Node) {
  const [lines, amount] = childrenOf(row);
  return { lines: childrenOf(lines), amount };
}

// Estructura del esqueleto: etiqueta y campo, chips, contador y filas (dos líneas a la izquierda y el importe).
function parts() {
  const group = screen.getByLabelText(LOADING);
  const [blocks] = childrenOf(group);
  const [header, counter, ...below] = childrenOf(blocks);
  const counterLine = below.find(isSeparator);
  const list = below.find((node) => !isSeparator(node));
  const [search, chips] = childrenOf(header);
  const rows = childrenOf(list).filter((node) => !isSeparator(node));

  return {
    list: childrenOf(list),
    counterBox: counter,
    counterLine,
    search: childrenOf(search),
    chipsBox: chips,
    chips: childrenOf(chips),
    counter: childrenOf(counter),
    rows,
    rowBlocks: rows.flatMap((row) => {
      const { lines, amount } = rowParts(row);
      return amount ? [...lines, amount] : lines;
    }),
  };
}

function allBlocks() {
  const { search, chips, counter, rowBlocks } = parts();
  return [...search, ...chips, ...counter, ...rowBlocks];
}

it('tiene la búsqueda, dos chips, el contador y seis filas con sus formas', async () => {
  await renderSkeleton();

  const { fontScale } = Dimensions.get('window');
  const { search, chips, chipsBox, counter, counterBox, rows } = parts();

  expect(search.map(shapeOf)).toEqual([
    { width: '40%', height: typography.label.lineHeight * fontScale, borderRadius: radii.skeleton },
    { width: '100%', height: layout.inputHeight, borderRadius: radii.input },
  ]);
  const chip = { width: layout.chipSkeletonWidth, height: layout.chipHeight, borderRadius: radii.pill };
  expect(chips.map(shapeOf)).toEqual([chip, chip]);
  // Mismo espacio vertical que la fila real de chips: el listado no salta al terminar la carga.
  expect(styleOf(chipsBox)).toMatchObject({ paddingVertical: spacing.xxs });
  expect(styleOf(counterBox)).toMatchObject({ minHeight: layout.minTouch, justifyContent: 'center' });
  expect(counter.map(shapeOf)).toEqual([
    { width: '30%', height: typography.caption.lineHeight * fontScale, borderRadius: radii.skeleton },
  ]);
  expect(rows.length).toBe(6);
  expect(rows.map((row) => styleOf(row).minHeight)).toEqual(rows.map(() => layout.listItemMinHeight));
  expect(rows.map((row) => rowParts(row).lines.map(shapeOf))).toEqual(
    rows.map(() => [
      { width: '60%', height: typography.label.lineHeight * fontScale, borderRadius: radii.skeleton },
      { width: '80%', height: typography.caption.lineHeight * fontScale, borderRadius: radii.skeleton },
    ]),
  );
  expect(rows.map((row) => shapeOf(rowParts(row).amount))).toEqual(
    rows.map(() => ({
      width: '30%',
      height: typography.amount.lineHeight * fontScale,
      borderRadius: radii.skeleton,
    })),
  );
});

it('con reducción de movimiento queda estático', async () => {
  const loop = jest.spyOn(Animated, 'loop');
  await renderSkeleton();

  const blocks = allBlocks();

  expect(blocks.length).toBe(23);
  expect(blocks.map((item) => styleOf(item).backgroundColor)).toEqual(
    blocks.map(() => colors.skeletonBase),
  );
  expect(blocks.map((item) => styleOf(childrenOf(item)[0]).opacity)).toEqual(blocks.map(() => 0));
  expect(loop).not.toHaveBeenCalled();
});

it('los bloques usan el tono de superficie', async () => {
  await renderSkeleton();

  const blocks = allBlocks();

  expect(blocks.length).toBe(23);
  expect(blocks.map((item) => styleOf(item).overflow)).toEqual(blocks.map(() => 'hidden'));
  expect(blocks.map((item) => styleOf(childrenOf(item)[0]).backgroundColor)).toEqual(
    blocks.map(() => colors.skeletonHighlight),
  );
});

it('separa las filas con una línea de 1 dp como la de la lista', async () => {
  await renderSkeleton();

  const { list, counterLine } = parts();
  const separators = list.filter((_, index) => index % 2 === 1);

  expect(styleOf(counterLine)).toEqual({ height: 1, backgroundColor: colors.borderSubtle });
  expect(list.length).toBe(11);
  expect(separators.map(styleOf)).toEqual(separators.map(() => ({ height: 1, backgroundColor: colors.borderSubtle })));
  expect(list.filter((_, index) => index % 2 === 0).map((row) => styleOf(row).minHeight)).toEqual(
    Array.from({ length: 6 }, () => layout.listItemMinHeight),
  );
});
