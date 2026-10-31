import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ComingSoon } from '@/features/transfers/components/ComingSoon';
import { colors, spacing, typography } from '@/theme';

const TITLE = 'Disponible pronto';
const TEXT = 'Esta sección estará lista en breve.';

it('muestra Disponible pronto como encabezado y el texto de la sección, sin acciones', async () => {
  await render(<ComingSoon />);

  const title = screen.getByRole('header', { name: TITLE });
  expect(title).toBe(screen.getByText(TITLE));
  expect(screen.getByText(TEXT)).toBeOnTheScreen();
  expect(screen.queryByRole('button')).not.toBeOnTheScreen();
});

it('aplica los estilos de encabezado y de texto secundario con el espaciado del tema', async () => {
  await render(<ComingSoon />);

  expect(screen.getByText(TITLE)).toHaveStyle({ ...typography.h2, color: colors.text });
  expect(screen.getByText(TEXT)).toHaveStyle({ ...typography.body, color: colors.textSecondary });

  const container = screen.getByText(TITLE).parent;
  expect(StyleSheet.flatten(container?.props.style)).toMatchObject({ gap: spacing.xs });
});
