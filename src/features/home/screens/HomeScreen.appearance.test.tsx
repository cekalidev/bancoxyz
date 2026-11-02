import { router } from 'expo-router';
import { act, screen } from 'expo-router/testing-library';
import { Appearance, StyleSheet, useColorScheme } from 'react-native';

import { balanceBody } from '@/test/apiFixtures';
import { mockApiRoutes, reply } from '@/test/fetchMock';
import { homeSession, renderHome, settleRequests } from '@/test/homeHelpers';
import { SPINNER_TYPES } from '@/test/spinners';
import { colors } from '@/theme';

const SCROLL_TYPES = ['RCTScrollView'];
const REFRESH_TYPES = ['RCTRefreshControl', 'AndroidSwipeRefreshLayout'];
const AMOUNT = 'US$\u00a01.800,00';
const WIDE_AMOUNT = 'US$\u00a01.234.567,89';

type Node = ReturnType<typeof screen.getByText>;

function nodesOfType(types: string[]) {
  return screen.container.queryAll((node) => types.includes(String(node.type)));
}

// El ScrollView más cercano por encima del nodo, si lo hay.
function scrollViewAbove(node: Node) {
  for (let current = node.parent; current; current = current.parent) {
    if (current.type === 'RCTScrollView') return current;
  }
  return undefined;
}

async function showLoading() {
  await renderHome({ balance: 'pending' });
}

async function showFirstLoadNotice() {
  await renderHome({ balance: 'networkError' });
  await settleRequests();
}

async function showBalance() {
  await renderHome();
  await settleRequests();
}

// Con la cifra ya cargada, vuelve al Inicio con un refresco fallido: aviso y cifra a la vez.
async function showBalanceWithNotice() {
  await showBalance();
  await act(async () => router.push('/transferencias'));
  mockApiRoutes({ balance: 'networkError' });
  await act(async () => router.back());
  await settleRequests();
}

const homeStates: [string, () => Promise<void>, () => void][] = [
  ['carga', showLoading, () => expect(screen.getByLabelText('Cargando…')).toBeOnTheScreen()],
  [
    'aviso de la primera carga',
    showFirstLoadNotice,
    () => {
      expect(screen.getByRole('button', { name: 'Reintentar' })).toBeOnTheScreen();
      expect(screen.queryByText(AMOUNT)).not.toBeOnTheScreen();
    },
  ],
  ['cifra', showBalance, () => expect(screen.getByText(AMOUNT)).toBeOnTheScreen()],
  [
    'cifra con aviso',
    showBalanceWithNotice,
    () => {
      expect(screen.getByRole('button', { name: 'Reintentar' })).toBeOnTheScreen();
      expect(screen.getByText(AMOUNT)).toBeOnTheScreen();
    },
  ],
];

describe('HomeScreen: apariencia', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.mocked(useColorScheme).mockReturnValue('light');
  });

  it('mantiene fondo blanco y colores claros con el sistema en modo oscuro', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');
    jest.mocked(useColorScheme).mockReturnValue('dark');

    await renderHome();
    await settleRequests();

    const greeting = screen.getByRole('header', { name: `Hola, ${homeSession.user.name}` });
    const scrollView = greeting.parent?.parent;

    expect(greeting).toHaveStyle({ color: colors.textStrong });
    expect(scrollView?.type).toBe('RCTScrollView');
    expect(scrollView).toHaveStyle({ backgroundColor: colors.background });
  });
});

describe('HomeScreen: sin recarga ni indicadores giratorios', () => {
  afterEach(jest.restoreAllMocks);

  it.each(homeStates)(
    'no ofrece actualizar ni recarga al deslizar ni indicador giratorio en ningún estado (%s)',
    async (_state, showState, expectState) => {
      await showState();
      expectState();

      const scrollViews = nodesOfType(SCROLL_TYPES);
      expect(scrollViews.length).toBeGreaterThan(0);
      for (const scrollView of scrollViews) {
        expect(scrollView.props.refreshControl).toBeUndefined();
        expect(scrollView.props.onRefresh).toBeUndefined();
      }
      expect(nodesOfType(REFRESH_TYPES)).toHaveLength(0);
      expect(screen.queryByRole('button', { name: /actualizar/i })).not.toBeOnTheScreen();
      expect(screen.queryByText(/actualizar/i)).not.toBeOnTheScreen();
      expect(screen.queryByLabelText(/actualizar/i)).not.toBeOnTheScreen();
      expect(screen.queryByRole('progressbar')).not.toBeOnTheScreen();
      expect(nodesOfType(SPINNER_TYPES)).toHaveLength(0);
    },
  );
});

describe('HomeScreen: cifra de mayor tamaño', () => {
  afterEach(jest.restoreAllMocks);

  it('US$ 1.234.567,89 se muestra en una línea que encoge y la pantalla desplaza', async () => {
    await renderHome({ balance: reply(200, balanceBody(1234567.89, 'USD')) });
    await settleRequests();

    const amount = screen.getByText(WIDE_AMOUNT);
    const scrollView = scrollViewAbove(amount);

    expect(amount).toBeOnTheScreen();
    expect(amount.props.numberOfLines).toBe(1);
    expect(amount.props.adjustsFontSizeToFit).toBe(true);
    expect(amount.props.minimumFontScale).toBe(0.5);
    expect(scrollView?.type).toBe('RCTScrollView');
    expect(StyleSheet.flatten(scrollView?.props.contentContainerStyle)).toMatchObject({ flexGrow: 1 });
  });
});
