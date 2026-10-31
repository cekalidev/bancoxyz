import {
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
  within,
} from '@testing-library/react-native';
import { AccessibilityInfo, Platform, processColor, StyleSheet } from 'react-native';

import { Button } from '@/components/Button';
import { colors, gradients, layout, motion, radii, spacing, typography } from '@/theme';

const LABEL = 'Entrar';

const touchEvent = {
  nativeEvent: { touches: [], changedTouches: [], target: 1, timestamp: 0 },
  currentTarget: 1,
  persist: () => {},
};

async function renderButton(onPress = jest.fn()) {
  await render(<Button label={LABEL} onPress={onPress} />);
}

function getButton() {
  return screen.getByRole('button', { name: LABEL });
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Button primary', () => {
  it('el primary es una píldora de 52 con el degradado de acción y texto índigo', async () => {
    await renderButton();

    const button = getButton();

    expect(button).toHaveStyle({
      height: layout.buttonHeight,
      borderRadius: radii.pill,
      paddingHorizontal: spacing.xl,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    });
    expect(within(button).getByText(LABEL)).toHaveStyle({
      ...typography.button,
      color: colors.textOnAccent,
    });

    const gradient = within(button).getByTestId('button-gradient');

    expect(gradient).toHaveStyle(StyleSheet.absoluteFill);
    expect(gradient.props.colors).toEqual(gradients.cta.colors.map((color) => processColor(color)));
    expect(gradient.props.startPoint).toEqual([gradients.cta.start.x, gradients.cta.start.y]);
    expect(gradient.props.endPoint).toEqual([gradients.cta.end.x, gradients.cta.end.y]);
  });
});

describe('Button interacción', () => {
  it('avisa una vez al tocarlo', async () => {
    const onPress = jest.fn();
    await renderButton(onPress);

    await userEvent.setup().press(getButton());

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('al pulsarlo se atenúa y se encoge, y al soltarlo recupera su aspecto', async () => {
    await renderButton();

    await fireEvent(getButton(), 'responderGrant', touchEvent);
    expect(getButton()).toHaveStyle({
      opacity: motion.pressedOpacity,
      transform: [{ scale: motion.pressedScale }],
    });

    await fireEvent(getButton(), 'responderRelease', touchEvent);
    await waitFor(() => expect(getButton()).not.toHaveStyle({ opacity: motion.pressedOpacity }));
    expect(getButton()).not.toHaveStyle({ transform: [{ scale: motion.pressedScale }] });
  });

  it('en Android pinta la onda del tema por encima del degradado', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await renderButton();

    expect(getButton().props.nativeForegroundAndroid).toEqual(
      expect.objectContaining({ type: 'RippleAndroid', color: processColor(colors.ripple) }),
    );
  });
});

describe('Button con reducir movimiento', () => {
  it('al pulsarlo solo se atenúa, sin encogerse', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValueOnce(true);
    await renderButton();

    await fireEvent(getButton(), 'responderGrant', touchEvent);

    expect(getButton()).toHaveStyle({ opacity: motion.pressedOpacity });
    expect(StyleSheet.flatten(getButton().props.style)).not.toHaveProperty('transform');
  });
});

const BUSY_LABEL = 'Entrando…';

async function renderBusyButton(busyLabel?: string, onPress = jest.fn()) {
  await render(<Button label={LABEL} busy busyLabel={busyLabel} onPress={onPress} />);
}

describe('Button en envío', () => {
  it('en envío muestra el texto de progreso con estilo deshabilitado, sin degradado y anunciado como ocupado', async () => {
    await renderBusyButton(BUSY_LABEL);

    const button = screen.getByRole('button');

    expect(button).toBeDisabled();
    expect(button).toBeBusy();
    expect(button).toHaveAccessibleName(BUSY_LABEL);
    expect(button).toHaveStyle({
      backgroundColor: colors.disabledBg,
      height: layout.buttonHeight,
      borderRadius: radii.pill,
      paddingHorizontal: spacing.xl,
    });
    expect(within(button).getByText(BUSY_LABEL)).toHaveStyle({
      ...typography.button,
      color: colors.disabledText,
    });
    expect(screen.queryByText(LABEL)).not.toBeOnTheScreen();
    expect(within(button).queryByTestId('button-gradient')).not.toBeOnTheScreen();
    expect(screen.queryByRole('progressbar')).not.toBeOnTheScreen();
  });

  it('en envío no avisa al tocarlo', async () => {
    const onPress = jest.fn();
    await renderBusyButton(BUSY_LABEL, onPress);

    await userEvent.setup().press(screen.getByRole('button'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('en envío sin texto de progreso conserva su etiqueta', async () => {
    await renderBusyButton();

    expect(screen.getByRole('button', { name: LABEL })).toBeBusy();
  });
});

const GHOST_LABEL = 'Salir';
const MIN_TOUCH_AREA = 48;

async function renderGhostButton() {
  await render(<Button variant="ghost" label={GHOST_LABEL} onPress={jest.fn()} />);
  return screen.getByRole('button', { name: GHOST_LABEL });
}

describe('Button ghost', () => {
  it('el ghost tiene al menos 48 de alto', async () => {
    const button = await renderGhostButton();

    expect(layout.minTouch).toBeGreaterThanOrEqual(MIN_TOUCH_AREA);
    expect(button).toHaveStyle({ minHeight: layout.minTouch, minWidth: layout.minTouch });
  });

  it('el ghost es una píldora con relleno lateral que recorta su onda, sin perder los 48 mínimos', async () => {
    const button = await renderGhostButton();

    expect(button).toHaveStyle({
      borderRadius: radii.pill,
      overflow: 'hidden',
      paddingHorizontal: spacing.sm,
      minHeight: layout.minTouch,
      minWidth: layout.minTouch,
    });
  });

  it('el ghost es transparente, centra su texto índigo y no lleva degradado', async () => {
    const button = await renderGhostButton();

    expect(button).toHaveStyle({
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    });
    expect(within(button).getByText(GHOST_LABEL)).toHaveStyle({
      ...typography.button,
      color: colors.textStrong,
    });
    expect(within(button).queryByTestId('button-gradient')).not.toBeOnTheScreen();
  });
});
