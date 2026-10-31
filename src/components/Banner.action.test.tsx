import { fireEvent, render, screen } from '@testing-library/react-native';

import { Banner } from '@/components/Banner';
import { colors, spacing } from '@/theme';

const MESSAGE = 'No hay conexión. Revisa tu internet e inténtalo de nuevo.';
const LABEL = 'Reintentar';
const SPINNER_TYPES = ['RCTActivityIndicatorView', 'AndroidProgressBar', 'ActivityIndicator'];

type Align = 'center' | 'end';
type Node = ReturnType<typeof screen.getByText>;

function getRegion() {
  const regions = screen.container.queryAll((node) => node.props.accessibilityLiveRegion === 'polite');

  expect(regions).toHaveLength(1);
  return regions[0];
}

function getAction() {
  return screen.getByRole('button', { name: LABEL });
}

function isInside(node: Node, ancestor: Node) {
  let current: Node | null = node.parent;
  while (current) {
    if (current === ancestor) return true;
    current = current.parent;
  }
  return false;
}

function querySpinners() {
  return screen.container.queryAll(
    (node) =>
      node.props.accessibilityRole === 'progressbar' ||
      node.props.role === 'progressbar' ||
      SPINNER_TYPES.includes(String(node.type)),
  );
}

function bannerWith(align: Align, { busy = false, onPress = jest.fn(), message = MESSAGE as string | null } = {}) {
  return <Banner variant="error" message={message} action={{ label: LABEL, onPress, busy, align }} />;
}

describe('Banner con acción', () => {
  it('muestra la acción como botón secundario fuera de la región que se anuncia', async () => {
    const onPress = jest.fn();
    await render(bannerWith('center', { onPress }));
    const region = getRegion();
    const button = getAction();

    expect(button).toHaveStyle({ backgroundColor: colors.surfaceMuted });
    expect(isInside(button, region)).toBe(false);
    expect(region.parent).not.toBeNull();
    expect(isInside(button, region.parent as Node)).toBe(true);
    expect(button.parent).toHaveStyle({ marginTop: spacing.sm, alignSelf: 'center' });

    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);

    await screen.rerender(bannerWith('end'));
    expect(getAction().parent).toHaveStyle({ marginTop: spacing.sm, alignSelf: 'flex-end' });

    await screen.rerender(bannerWith('end', { message: null }));
    expect(screen.queryByRole('button', { name: LABEL })).toBeNull();
  });

  it('la acción ocupada queda deshabilitada y anunciada como ocupada sin indicador', async () => {
    const onPress = jest.fn();
    await render(bannerWith('end', { busy: true, onPress }));
    const button = getAction();

    expect(button).toBeDisabled();
    expect(button).toBeBusy();
    expect(querySpinners()).toHaveLength(0);
    expect(screen.getByText(MESSAGE)).toBeOnTheScreen();

    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Banner con acción ocupada', () => {
  it('la acción ocupada muestra su texto de progreso', async () => {
    const action = {
      label: LABEL,
      onPress: jest.fn(),
      busy: true,
      align: 'end' as const,
      busyLabel: 'Reintentando…',
    };
    await render(<Banner variant="error" message={MESSAGE} action={action} />);
    const button = screen.getByRole('button', { name: 'Reintentando…' });

    expect(button).toBeDisabled();
    expect(button).toBeBusy();
    expect(screen.getByText('Reintentando…')).toBeOnTheScreen();
    expect(screen.queryByText(LABEL)).toBeNull();

    await screen.rerender(<Banner variant="error" message={MESSAGE} action={{ ...action, busy: false }} />);
    expect(screen.getByRole('button', { name: LABEL })).not.toBeBusy();
    expect(screen.queryByText('Reintentando…')).toBeNull();
  });
});
