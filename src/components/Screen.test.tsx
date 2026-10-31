import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Screen } from '@/components/Screen';
import { colors, layout } from '@/theme';

const metrics = {
  insets: { top: 24, bottom: 16, left: 0, right: 0 },
  frame: { x: 0, y: 0, width: 390, height: 844 },
};

describe('Screen', () => {
  it('deja espacio para la barra de gestos según el área segura', async () => {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <Screen>
          <Text>Contenido</Text>
        </Screen>
      </SafeAreaProvider>,
    );

    const container = screen.getByText('Contenido').parent;

    expect(container).toHaveStyle({
      flex: 1,
      backgroundColor: colors.background,
      padding: layout.screenPadding,
      paddingBottom: metrics.insets.bottom + layout.screenPadding,
    });
  });
});

describe('Screen', () => {
  it('con scroll usa un ScrollView sin recarga al deslizar', async () => {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <Screen scroll>
          <Text>Contenido</Text>
        </Screen>
      </SafeAreaProvider>,
    );

    const scrollView = screen.getByText('Contenido').parent?.parent;

    expect(scrollView?.type).toBe('RCTScrollView');
    expect(scrollView?.props.refreshControl).toBeUndefined();
    expect(scrollView).toHaveStyle({ flex: 1, backgroundColor: colors.background });
    expect(StyleSheet.flatten(scrollView?.props.contentContainerStyle)).toEqual({
      flexGrow: 1,
      padding: layout.screenPadding,
      paddingBottom: metrics.insets.bottom + layout.screenPadding,
    });
  });
});
