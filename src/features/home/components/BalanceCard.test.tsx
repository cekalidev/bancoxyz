import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { createRef, useState } from 'react';
import { processColor, StyleSheet, type ViewInstance } from 'react-native';

import { BalanceCard } from '@/features/home/components/BalanceCard';
import { colors, gradients, layout, radii, spacing, typography } from '@/theme';

const NBSP = '\u00a0';
const LABEL = 'Saldo disponible';

// Tabla de la cifra de la spec: importe, moneda, cifra visible y anuncio del lector de pantalla.
const ROWS: [number, string, string, string][] = [
  [1, 'USD', `US$${NBSP}1,00`, 'Saldo disponible: 1,00 dólares'],
  [1800, 'USD', `US$${NBSP}1.800,00`, 'Saldo disponible: 1.800,00 dólares'],
  [0, 'USD', `US$${NBSP}0,00`, 'Saldo disponible: 0,00 dólares'],
  [-150, 'USD', `-US$${NBSP}150,00`, 'Saldo disponible: menos 150,00 dólares'],
  [1234567.89, 'USD', `US$${NBSP}1.234.567,89`, 'Saldo disponible: 1.234.567,89 dólares'],
  [1500.5, 'BRL', `R$${NBSP}1.500,50`, 'Saldo disponible: 1.500,50 reales'],
  [10, 'EUR', `€${NBSP}10,00`, 'Saldo disponible: 10,00 euros'],
  [10, 'CLP', `CLP${NBSP}10,00`, 'Saldo disponible: 10,00 CLP'],
];
const AMOUNTS = ROWS.map(([amount, currency, visible, spoken]) => ({
  amount,
  currency,
  visible,
  spoken,
}));

// Cifra oculta por moneda: el símbolo y siempre seis puntos, sin signo.
const MASKED: Record<string, string> = {
  USD: `US$${NBSP}••••••`,
  BRL: `R$${NBSP}••••••`,
  EUR: `€${NBSP}••••••`,
  CLP: `CLP${NBSP}••••••`,
};

async function renderCard(amount = 1800, currency = 'USD') {
  const cardRef = createRef<ViewInstance>();
  await render(
    <BalanceCard
      balance={{ amount, currency }}
      cardRef={cardRef}
      hidden={false}
      onToggleHidden={() => {}}
    />,
  );
  return cardRef;
}

afterEach(() => {
  jest.restoreAllMocks();
});

it.each(AMOUNTS)(
  'muestra Saldo disponible y la cifra de cada moneda en una línea ($amount $currency)',
  async ({ amount, currency, visible }) => {
    await renderCard(amount, currency);

    const label = screen.getByText(LABEL);
    expect(label).toHaveStyle({ ...typography.body, color: colors.textOnBrand });

    const figure = screen.getByText(visible);
    expect(figure).toHaveProp('numberOfLines', 1);
    expect(figure).toHaveStyle({ ...typography.stat, color: colors.textOnBrand });
  },
);

it.each(AMOUNTS)(
  'la tarjeta es un solo elemento que se anuncia con el saldo hablado ($amount $currency)',
  async ({ amount, currency, visible, spoken }) => {
    const cardRef = await renderCard(amount, currency);

    const [card, ...rest] = screen.getAllByLabelText(/^Saldo disponible/);
    expect(rest).toHaveLength(0);
    expect(card).toHaveAccessibleName(spoken);
    expect(card).toHaveProp('accessible', true);
    expect(card).toHaveStyle({ padding: spacing.xl });
    expect(cardRef.current).not.toBeNull();

    expect(within(card).getByText(LABEL)).toBeOnTheScreen();
    expect(within(card).getByText(visible)).toBeOnTheScreen();
  },
);

it('usa el degradado de marca con radio de tarjeta y sin sombra', async () => {
  await renderCard();

  const card = screen.getByLabelText(/^Saldo disponible/);
  const container = card.parent;
  expect(container).not.toBeNull();
  const style = StyleSheet.flatten(container?.props.style);
  expect(style).toMatchObject({ borderRadius: radii.card, overflow: 'hidden' });
  expect(style).not.toHaveProperty('elevation');
  expect(style).not.toHaveProperty('shadowOpacity');
  expect(style).not.toHaveProperty('boxShadow');

  const gradient = screen.getByTestId('balance-card-gradient', { includeHiddenElements: true });
  expect(gradient).toHaveStyle(StyleSheet.absoluteFill);
  expect(gradient.props.colors).toEqual(gradients.brand.colors.map((color) => processColor(color)));
});

// La tarjeta no guarda el estado del ojo: lo controla el padre, como en la pantalla.
function CardWithEye({ amount, currency }: { amount: number; currency: string }) {
  const [hidden, setHidden] = useState(false);
  return (
    <BalanceCard
      balance={{ amount, currency }}
      cardRef={createRef<ViewInstance>()}
      hidden={hidden}
      onToggleHidden={() => setHidden((current) => !current)}
    />
  );
}

it.each(AMOUNTS)(
  'oculto muestra el símbolo con seis puntos y se anuncia como oculto ($amount $currency)',
  async ({ amount, currency, visible }) => {
    const masked = MASKED[currency];
    await render(<CardWithEye amount={amount} currency={currency} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Ocultar saldo' }));

    expect(screen.getByText(masked)).toHaveStyle({ ...typography.stat, color: colors.textOnBrand });
    expect(screen.queryByText(visible)).toBeNull();
    const [card, ...rest] = screen.getAllByLabelText(/^Saldo disponible/);
    expect(rest).toHaveLength(0);
    expect(card).toHaveAccessibleName('Saldo disponible: oculto');
    expect(within(card).getByText(masked)).toBeOnTheScreen();
  },
);

it('el ojo es el mismo elemento al cambiar de estado', async () => {
  await render(<CardWithEye amount={1800} currency="USD" />);

  const eye = screen.getByRole('button', { name: 'Ocultar saldo' });
  await fireEvent.press(eye);
  expect(screen.getByRole('button', { name: 'Mostrar saldo' })).toBe(eye);

  await fireEvent.press(eye);
  expect(screen.getByRole('button', { name: 'Ocultar saldo' })).toBe(eye);
  expect(screen.getByText(`US$${NBSP}1.800,00`)).toBeOnTheScreen();
});

it('el ojo mide 48 por 48', async () => {
  await renderCard();

  const eye = screen.getByRole('button', { name: 'Ocultar saldo' });
  expect(eye).toHaveStyle({ width: layout.minTouch, height: layout.minTouch });
});

it('la cifra ocupa una línea y encoge para caber', async () => {
  await render(<CardWithEye amount={1234567.89} currency="USD" />);

  const visible = screen.getByText(`US$${NBSP}1.234.567,89`);
  expect(visible).toHaveProp('numberOfLines', 1);
  expect(visible).toHaveProp('adjustsFontSizeToFit', true);
  expect(visible).toHaveProp('minimumFontScale', 0.5);

  await fireEvent.press(screen.getByRole('button', { name: 'Ocultar saldo' }));

  const masked = screen.getByText(MASKED.USD);
  expect(masked).toHaveProp('numberOfLines', 1);
  expect(masked).toHaveProp('adjustsFontSizeToFit', true);
  expect(masked).toHaveProp('minimumFontScale', 0.5);
});

it('deja entre la etiqueta y la cifra el mismo espacio que el skeleton', async () => {
  await renderCard();

  const card = screen.getByLabelText(/^Saldo disponible/);
  expect(card).toHaveStyle({ gap: spacing.xs, padding: spacing.xl });
});
