import { render, screen } from '@testing-library/react-native';
import { Dimensions, processColor, StyleSheet } from 'react-native';

import { BalanceCardSkeleton } from '@/features/home/components/BalanceCardSkeleton';
import { mockReducedMotion } from '@/test/reducedMotion';
import { gradients, radii, spacing, typography } from '@/theme';

const LOADING = 'Cargando…';

async function renderSkeleton() {
  mockReducedMotion(true);
  await render(<BalanceCardSkeleton />);
}

afterEach(() => {
  jest.restoreAllMocks();
});

it('se anuncia como Cargando… y ocupado, oculta sus bloques al lector y no tiene ojo', async () => {
  await renderSkeleton();

  const [card, ...rest] = screen.getAllByLabelText(LOADING);
  expect(rest).toHaveLength(0);
  expect(card).toHaveProp('accessible', true);
  expect(card).toBeBusy();

  const blocks = screen.getByTestId('balance-skeleton-blocks', { includeHiddenElements: true });
  expect(blocks).toHaveProp('importantForAccessibility', 'no-hide-descendants');
  expect(screen.queryByTestId('balance-skeleton-blocks')).not.toBeOnTheScreen();

  expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  expect(screen.queryByLabelText(/Ocultar saldo|Mostrar saldo/)).not.toBeOnTheScreen();
});

it('tiene la forma de la tarjeta con un bloque de etiqueta y otro de cifra', async () => {
  await renderSkeleton();

  const card = screen.getByLabelText(LOADING);
  expect(card).toHaveStyle({ borderRadius: radii.card, overflow: 'hidden', padding: spacing.xl });

  const gradient = screen.getByTestId('balance-skeleton-gradient', { includeHiddenElements: true });
  expect(gradient).toHaveStyle(StyleSheet.absoluteFill);
  expect(gradient.props.colors).toEqual(gradients.brand.colors.map((color) => processColor(color)));

  const { fontScale } = Dimensions.get('window');
  const blocks = screen.getByTestId('balance-skeleton-blocks', { includeHiddenElements: true });
  const [label, amount] = blocks.children.map((block) =>
    typeof block === 'string' ? {} : StyleSheet.flatten(block.props.style),
  );
  expect(label).toMatchObject({ width: '60%', height: typography.body.lineHeight * fontScale });
  expect(amount).toMatchObject({ width: '80%', height: typography.stat.lineHeight * fontScale });
});
