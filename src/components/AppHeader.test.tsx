import { isHiddenFromAccessibility, render, screen, userEvent } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { accessibleOrder } from '@/test/a11yTree';
import { colors, layout, spacing, typography } from '@/theme';

const metrics = {
  insets: { top: 24, bottom: 16, left: 0, right: 0 },
  frame: { x: 0, y: 0, width: 390, height: 844 },
};

const LOGO_SIZE = 40;
const HIDDEN = { includeHiddenElements: true };

describe('AppHeader', () => {
  it('muestra el logo de 40 sin teñir con etiqueta BancoXYZ y el título en una barra de 56', async () => {
    await render(<AppHeader />);

    const logo = screen.getByLabelText('BancoXYZ');
    const title = screen.getByText('BancoXYZ', HIDDEN);

    expect(logo).toHaveStyle({ width: LOGO_SIZE, height: LOGO_SIZE });
    expect(StyleSheet.flatten(logo.props.style)).not.toHaveProperty('tintColor');
    expect(logo.props).not.toHaveProperty('tintColor');
    expect(title).toHaveStyle({ ...typography.h2, color: colors.text });
    expect(title.parent).toHaveStyle({
      minHeight: layout.appBarHeight,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: layout.screenPadding,
    });
    expect(logo.parent).toBe(title.parent);
  });

  it('deja espacio para la barra de estado según el área segura', async () => {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <AppHeader />
      </SafeAreaProvider>,
    );

    const row = screen.getByText('BancoXYZ', HIDDEN).parent;

    expect(row).toHaveStyle({ minHeight: layout.appBarHeight });
    expect(row?.parent).toHaveStyle({
      backgroundColor: colors.background,
      paddingTop: metrics.insets.top,
    });
  });
});

describe('AppHeader alto de la barra', () => {
  it('la barra mide al menos 56 y crece con el texto, sin alto fijo', async () => {
    const { unmount } = await render(<AppHeader />);
    const brandBar = screen.getByText('BancoXYZ', HIDDEN).parent;

    expect(layout.appBarHeight).toBe(56);
    expect(brandBar).toHaveStyle({ minHeight: layout.appBarHeight });
    expect(StyleSheet.flatten(brandBar?.props.style)).not.toHaveProperty('height');
    await unmount();

    await render(<AppHeader title="Nueva transferencia" onBack={jest.fn()} />);
    const backBar = screen.getByText('Nueva transferencia').parent;

    expect(backBar).toHaveStyle({ minHeight: layout.appBarHeight });
    expect(StyleSheet.flatten(backBar?.props.style)).not.toHaveProperty('height');
  });
});

describe('AppHeader acción derecha', () => {
  it('muestra la acción derecha cuando se le pasa', async () => {
    await render(<AppHeader right={<Text>Acción derecha</Text>} />);

    const title = screen.getByText('BancoXYZ', HIDDEN);
    const bar = title.parent;

    expect(bar?.children).toHaveLength(3);
    expect(bar?.children[2]).toBe(screen.getByText('Acción derecha'));
    expect(title).toHaveStyle({ flex: 1 });
  });
});

describe('AppHeader accesibilidad', () => {
  it('con el título BancoXYZ el logo se anuncia una vez como imagen y el título queda oculto a los lectores', async () => {
    await render(<AppHeader />);

    const logo = screen.getByRole('image', { name: 'BancoXYZ' });
    const title = screen.getByText('BancoXYZ', HIDDEN);

    expect(accessibleOrder()).toEqual(['BancoXYZ']);
    expect(logo.props.accessible).toBe(true);
    expect(title.props.accessibilityElementsHidden).toBe(true);
    expect(title.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(isHiddenFromAccessibility(title)).toBe(true);
    expect(screen.queryByRole('header')).toBeNull();
  });

  it('con otro título y sin volver el logo se anuncia y el título es un encabezado', async () => {
    await render(<AppHeader title="Mis datos" />);

    expect(accessibleOrder()).toEqual(['BancoXYZ', 'Mis datos']);
    expect(screen.getByLabelText('BancoXYZ').props.accessible).toBe(true);
    expect(screen.getByRole('header', { name: 'Mis datos' })).toBe(screen.getByText('Mis datos'));
  });
});

const BACK_TITLE = 'Nueva transferencia';

const renderWithBack = (onBack = jest.fn()) => render(<AppHeader title={BACK_TITLE} onBack={onBack} />);

describe('AppHeader con volver', () => {
  it('con volver muestra el botón Volver y el título como encabezado', async () => {
    const onBack = jest.fn();
    await renderWithBack(onBack);

    expect(screen.getByRole('header', { name: BACK_TITLE })).toBe(screen.getByText(BACK_TITLE));
    expect(screen.queryByText('BancoXYZ')).toBeNull();

    await userEvent.setup().press(screen.getByRole('button', { name: 'Volver' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('Volver mide 48 por 48', async () => {
    await renderWithBack();

    expect(layout.minTouch).toBe(48);
    expect(screen.getByRole('button', { name: 'Volver' })).toHaveStyle({
      width: layout.minTouch,
      height: layout.minTouch,
      alignItems: 'center',
      justifyContent: 'center',
    });
  });
});

describe('AppHeader con volver accesibilidad y tamaño', () => {
  it('con volver el logo es decorativo', async () => {
    await renderWithBack();

    const logo = screen.getByLabelText('BancoXYZ', HIDDEN);
    const exposed = screen.getAllByRole(/^(button|header)$/);

    expect(screen.queryByLabelText('BancoXYZ')).toBeNull();
    expect(logo.props.accessible).toBe(false);
    expect(logo.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(logo).toHaveStyle({ width: LOGO_SIZE, height: LOGO_SIZE });
    expect(exposed).toEqual([
      screen.getByRole('button', { name: 'Volver' }),
      screen.getByRole('header', { name: BACK_TITLE }),
    ]);
  });

  it('con volver la barra crece con el título', async () => {
    await renderWithBack();

    const title = screen.getByText(BACK_TITLE);
    const bar = title.parent;

    expect(bar).toHaveStyle({ minHeight: layout.appBarHeight, flexDirection: 'row' });
    expect(StyleSheet.flatten(bar?.props.style)).not.toHaveProperty('height');
    expect(title).toHaveStyle({ ...typography.h2, color: colors.text, flex: 1 });
    expect(title.props.numberOfLines).toBeUndefined();
  });
});
