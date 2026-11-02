import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/Button';
import { mockReducedMotion } from '@/test/reducedMotion';
import { colors, layout, motion, radii, spacing, typography } from '@/theme';

const LABEL = 'Ver transferencias';
const SECONDARY_HEIGHT = 52;

const touchEvent = {
  nativeEvent: { touches: [], changedTouches: [], target: 1, timestamp: 0 },
  currentTarget: 1,
  persist: () => {},
};

async function renderSecondary() {
  await render(<Button variant="secondary" label={LABEL} onPress={jest.fn()} />);
  return screen.getByRole('button', { name: LABEL });
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Button secondary', () => {
  it('el secundario es una píldora gris claro con texto azul marino y sin degradado', async () => {
    const button = await renderSecondary();

    expect(button).toHaveStyle({
      borderRadius: radii.pill,
      paddingHorizontal: spacing.xl,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    });
    expect(within(button).getByText(LABEL)).toHaveStyle({
      ...typography.button,
      color: colors.text,
    });
    expect(StyleSheet.flatten(button.props.style)).not.toHaveProperty('borderWidth');
    expect(within(button).queryByTestId('button-gradient')).not.toBeOnTheScreen();
  });

  it('el secundario no se encoge con reducción de movimiento', async () => {
    mockReducedMotion(true);
    const button = await renderSecondary();

    await fireEvent(button, 'responderGrant', touchEvent);

    expect(button).toHaveStyle({ opacity: motion.pressedOpacity });
    expect(StyleSheet.flatten(button.props.style)).not.toHaveProperty('transform');
  });
});

describe('Button secondary alto', () => {
  it('el secundario mide 52 de alto', async () => {
    const button = await renderSecondary();

    expect(layout.buttonHeight).toBe(SECONDARY_HEIGHT);
    expect(button).toHaveStyle({ minHeight: SECONDARY_HEIGHT });
    expect(StyleSheet.flatten(button.props.style)).not.toHaveProperty('height');
  });

  it('el secundario crece en alto con su texto y no tiene alto fijo', async () => {
    const button = await renderSecondary();

    expect(button).toHaveStyle({ minHeight: layout.buttonHeight, paddingVertical: spacing.sm });
    expect(StyleSheet.flatten(button.props.style)).not.toHaveProperty('height');
    expect(within(button).getByText(LABEL).props.numberOfLines).toBeUndefined();
  });
});
