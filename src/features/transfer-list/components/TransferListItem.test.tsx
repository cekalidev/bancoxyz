import {
  isHiddenFromAccessibility,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import { processColor } from 'react-native';

import { ClockIcon } from '@/components/icons/ClockIcon';
import type { Transfer } from '@/services/api/types';
import { colors, layout, spacing, typography } from '@/theme';

import { toTransferRow } from '../transferRow';
import type { TransferRow } from '../types';
import { TransferListItem } from './TransferListItem';

const NAME = 'Ronaldo de Assis Moreira';
const DETAIL = 'CPF 110.299.202-88 · 12/06/2024';
const AMOUNT = 'US$ 3.500,00';
const SCHEDULED_LABEL = 'Programada';
const TOMORROW: Partial<Transfer> = { date: { year: 2026, month: 11, day: 1 } };

const transfer: Transfer = {
  payeeName: NAME,
  payeeDocument: '11029920288',
  amount: 3500,
  currency: 'USD',
  date: { year: 2024, month: 6, day: 12 },
};

type Case = {
  overrides: Partial<Transfer>;
  amount: string;
  detail: string;
  absent: string[];
};

const cases: Case[] = [
  { overrides: {}, amount: AMOUNT, detail: DETAIL, absent: [] },
  {
    overrides: { amount: 250, currency: 'BRL' },
    amount: 'R$ 250,00',
    detail: DETAIL,
    absent: [AMOUNT],
  },
  {
    overrides: { payeeDocument: '12345' },
    amount: AMOUNT,
    detail: 'Documento 12345 · 12/06/2024',
    absent: [],
  },
];

function rowOf(overrides: Partial<Transfer>) {
  return toTransferRow(
    { transfer: { ...transfer, ...overrides }, receivedIndex: 0 },
    { year: 2026, month: 10, day: 31 },
  );
}

function expectTextsOnScreen({ amount, detail, absent }: Case) {
  expect(screen.queryByText(NAME)).toBeOnTheScreen();
  expect(screen.queryByText(detail)).toBeOnTheScreen();
  expect(screen.queryByText(amount)).toBeOnTheScreen();
  absent.forEach((text) => {
    expect(screen.queryByText(text)).not.toBeOnTheScreen();
  });
}

function expectUnlimitedLines(texts: string[]) {
  texts.forEach((text) => {
    expect(screen.getByText(text).props.numberOfLines).toBeUndefined();
    expect(screen.getByText(text).props.ellipsizeMode).toBeUndefined();
  });
}

function expectItemSpacing() {
  expect(screen.root).toHaveStyle({
    minHeight: layout.listItemMinHeight,
    paddingVertical: spacing.md,
  });
}

function expectTopRowWrapsThenDetail({ amount, detail }: Case) {
  const topRow = screen.getByText(NAME).parent;
  const rootChildren = screen.root?.children ?? [];

  expect(topRow).toHaveStyle({
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.sm,
  });
  expect(rootChildren).toHaveLength(2);
  expect(rootChildren[1]).toHaveTextContent(detail);
  expect(topRow?.children).toHaveLength(2);
  expect(topRow?.children[0]).toHaveTextContent(NAME);
  expect(topRow?.children[1]).toHaveTextContent(amount);
}

function expectSingleLabelledElement({ spokenLabel }: TransferRow) {
  expect(spokenLabel).toContain(NAME);
  expect(screen.root).toHaveProp('accessible', true);
  expect(screen.root).toHaveAccessibleName(spokenLabel);

  const labelled = screen.getAllByLabelText(spokenLabel);

  expect(labelled).toHaveLength(1);
  expect(labelled[0] === screen.root).toBe(true);
}

function expectNoButtonRole() {
  expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  expect(screen.root).not.toHaveProp('accessibilityRole');
  expect(screen.root).not.toHaveProp('role');
}

function expectNoPressHandlers(element: NonNullable<typeof screen.root>) {
  ['onPress', 'onClick', 'onResponderGrant', 'onResponderRelease'].forEach((handler) => {
    expect(element).not.toHaveProp(handler);
  });
}

function expectTypography({ amount, detail }: Case) {
  expect(screen.getByText(NAME)).toHaveStyle({
    ...typography.label,
    color: colors.text,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '55%',
  });
  expect(screen.getByText(amount)).toHaveStyle({
    ...typography.amount,
    color: colors.text,
    flexShrink: 0,
    marginLeft: 'auto',
    textAlign: 'right',
  });
  expect(screen.getByText(detail)).toHaveStyle({
    ...typography.caption,
    color: colors.textSecondary,
  });
}

it.each(cases)(
  'muestra el nombre completo, el detalle y el importe sin limitar líneas',
  async (testCase) => {
    await render(<TransferListItem row={rowOf(testCase.overrides)} />);

    expectTextsOnScreen(testCase);
    expectUnlimitedLines([NAME, testCase.amount, testCase.detail]);
    expectItemSpacing();
    expectTopRowWrapsThenDetail(testCase);
    expectTypography(testCase);
  },
);

it.each(cases)(
  'la fila es un solo elemento con su etiqueta y sin rol de botón',
  async ({ overrides }) => {
    const row = rowOf(overrides);

    await render(<TransferListItem row={row} />);

    expectSingleLabelledElement(row);
    expectNoButtonRole();
  },
);

it('la fila no es pulsable', async () => {
  const row = rowOf({});
  await render(<TransferListItem row={row} />);
  const element = screen.getByLabelText(row.spokenLabel);
  const before = screen.toJSON();

  await userEvent.press(element);

  expectNoPressHandlers(element);
  expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  expect(screen.toJSON()).toEqual(before);
});

it.each(cases)('el importe usa cifras tabulares', async ({ overrides, amount }) => {
  await render(<TransferListItem row={rowOf(overrides)} />);

  expect(screen.getByText(amount)).toHaveStyle({ fontVariant: ['tabular-nums'] });
});

// Nodos del icono dibujado: el contenedor del svg y los trazos que lo forman.
function iconNodes() {
  return screen.container.queryAll((node) => node.props.vbWidth !== undefined);
}

function pathsIn(nodes: ReturnType<typeof iconNodes>) {
  return nodes.flatMap((node) =>
    node.queryAll((child) => typeof child.props.d === 'string').map((child) => child.props.d),
  );
}

async function pathsOfClockIcon() {
  const { unmount } = await render(<ClockIcon color={colors.info} />);
  const paths = pathsIn(iconNodes());

  await unmount();
  return paths;
}

function expectScheduledMarker(clockPaths: string[], { detail, spokenLabel }: TransferRow) {
  const label = screen.getByText(SCHEDULED_LABEL);
  const icons = iconNodes();

  expect(label).toHaveStyle({ ...typography.caption, color: colors.info });
  expect(icons).toHaveLength(1);
  expect(pathsIn(icons)).toEqual(clockPaths);
  expect(isHiddenFromAccessibility(icons[0])).toBe(true);
  expect(
    icons[0].queryAll((child) => child.props.stroke?.payload === processColor(colors.info)),
  ).not.toHaveLength(0);
  expect(screen.root?.children).toHaveLength(3);
  expect(screen.root?.children[1]).toHaveTextContent(detail);
  expect(screen.root?.children[2]).toHaveTextContent(SCHEDULED_LABEL);
  expect(screen.root).toHaveAccessibleName(spokenLabel);
}

it('una fila programada muestra el icono de reloj y Programada', async () => {
  const clockPaths = await pathsOfClockIcon();
  const scheduled = rowOf(TOMORROW);

  await render(<TransferListItem row={scheduled} />);

  expect(scheduled.scheduled).toBe(true);
  expectScheduledMarker(clockPaths, scheduled);

  await screen.rerender(<TransferListItem row={rowOf({})} />);

  expect(screen.queryByText(SCHEDULED_LABEL)).not.toBeOnTheScreen();
  expect(iconNodes()).toHaveLength(0);
});
