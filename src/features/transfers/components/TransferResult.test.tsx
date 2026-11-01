import { isHiddenFromAccessibility, render, screen, userEvent, within } from '@testing-library/react-native';
import type { ComponentType } from 'react';
import { AccessibilityInfo, processColor } from 'react-native';

import { AlertIcon } from '@/components/icons/AlertIcon';
import { SuccessIcon } from '@/components/icons/SuccessIcon';
import { TransferResult } from '@/features/transfers/components/TransferResult';
import type { FinishedOutcome, TransferAttempt } from '@/features/transfers/types';
import { spyOnAnnouncements } from '@/test/homeHelpers';
import { colors, typography } from '@/theme';
import type { CalendarDate } from '@/utils/date';

type IconComponent = ComponentType<{ color: string; size?: number }>;

const NBSP = ' ';
const ICON_SIZE = 48;
const TODAY: CalendarDate = { year: 2026, month: 10, day: 31 };
const NEXT_MONTH: CalendarDate = { year: 2026, month: 11, day: 15 };
const MONEY = `US$${NBSP}1.250,00`;

function attemptOf(outcome: FinishedOutcome, date: CalendarDate): TransferAttempt {
  return {
    draft: { cents: 125000, currency: 'USD', document: '12345678900', date },
    outcome,
    finishedAt: 0,
  };
}

type ResultCase = {
  name: string;
  attempt: TransferAttempt;
  title: string;
  Icon: IconComponent;
  tint: string;
  lines: string[];
  // Líneas de datos que van en etiqueta; el resto va en cuerpo.
  dataLines: string[];
  spoken: { line: string; says: string }[];
};

// Cada resultado: intento, título, icono con su color y las líneas que se leen debajo del título.
const CASES: ResultCase[] = [
  {
    name: 'realizada',
    attempt: attemptOf('immediate', TODAY),
    title: 'Transferencia realizada',
    Icon: SuccessIcon,
    tint: colors.success,
    lines: [`Enviaste ${MONEY} al CPF 123.456.789-00.`, 'Fecha: 31/10/2026'],
    dataLines: [],
    spoken: [
      { line: `Enviaste ${MONEY} al CPF 123.456.789-00.`, says: 'Enviaste 1.250,00 dólares al CPF 123.456.789-00.' },
    ],
  },
  {
    name: 'programada',
    attempt: attemptOf('scheduled', NEXT_MONTH),
    title: 'Transferencia programada',
    Icon: SuccessIcon,
    tint: colors.success,
    lines: [`Se enviarán ${MONEY} al CPF 123.456.789-00 el 15/11/2026.`],
    dataLines: [],
    spoken: [
      {
        line: `Se enviarán ${MONEY} al CPF 123.456.789-00 el 15/11/2026.`,
        says: 'Se enviarán 1.250,00 dólares al CPF 123.456.789-00 el 15/11/2026.',
      },
    ],
  },
  {
    name: 'incierto',
    attempt: attemptOf('uncertain', TODAY),
    title: 'No pudimos confirmar si la transferencia se realizó',
    Icon: AlertIcon,
    tint: colors.warning,
    lines: [
      'Puede que se haya hecho. Antes de volver a enviarla, compruébala con estos datos:',
      `Valor: ${MONEY}`,
      'Destinatario: CPF 123.456.789-00',
      'Fecha: 31/10/2026',
    ],
    dataLines: [`Valor: ${MONEY}`, 'Destinatario: CPF 123.456.789-00', 'Fecha: 31/10/2026'],
    spoken: [{ line: `Valor: ${MONEY}`, says: 'Valor: 1.250,00 dólares' }],
  },
];

async function renderResult(attempt: TransferAttempt, onHome = jest.fn()) {
  await render(<TransferResult attempt={attempt} onHome={onHome} />);
}

// Nodos del icono dibujado: el contenedor del svg y los trazos que lo forman.
function iconNodes() {
  return screen.container.queryAll((node) => node.props.vbWidth !== undefined);
}

function pathsIn(nodes: ReturnType<typeof iconNodes>) {
  return nodes.flatMap((node) =>
    node.queryAll((child) => typeof child.props.d === 'string').map((child) => child.props.d),
  );
}

async function pathsOfIcon(Icon: IconComponent) {
  const { unmount } = await render(<Icon color={colors.text} size={ICON_SIZE} />);
  const paths = pathsIn(iconNodes());

  await unmount();
  return paths;
}

type FocusedNode = { props: { accessibilityRole?: string; children?: unknown } };

function isFocusedNode(node: unknown): node is FocusedNode {
  return typeof node === 'object' && node !== null && 'props' in node;
}

// Nodos a los que se pidió mover el foco del lector de pantalla.
function spyOnFocusedNodes() {
  const sendEvent = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockClear();
  return () =>
    sendEvent.mock.calls
      .filter(([, type]) => type === 'focus')
      .map(([node]) => (isFocusedNode(node) ? node.props : undefined));
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('resultado con icono y título', () => {
  it.each(CASES)(
    'cada estado lleva su icono y su título ($name)',
    async ({ attempt, title, Icon, tint }) => {
      const expectedPaths = await pathsOfIcon(Icon);
      await renderResult(attempt);

      const heading = screen.getByRole('header', { name: title });
      expect(heading).toHaveStyle({ ...typography.h2, color: colors.textStrong });

      const [icon, ...others] = iconNodes();
      expect(others).toHaveLength(0);
      expect(icon).toHaveProp('width', ICON_SIZE);
      expect(icon).toHaveProp('height', ICON_SIZE);
      expect(isHiddenFromAccessibility(icon)).toBe(true);
      expect(pathsIn([icon])).toEqual(expectedPaths);
      expect(
        icon.queryAll((child) => child.props.stroke?.payload === processColor(tint)),
      ).not.toHaveLength(0);
    },
  );

  it.each(CASES)(
    'cada estado muestra sus líneas en cuerpo y los datos en etiqueta ($name)',
    async ({ attempt, lines, dataLines }) => {
      await renderResult(attempt);

      for (const line of lines) {
        const font = dataLines.includes(line) ? typography.label : typography.body;
        expect(screen.getByText(line)).toHaveStyle({ ...font, color: colors.text });
      }
    },
  );
});

const BY_PLATFORM = CASES.flatMap((result) =>
  (['ios', 'android'] as const).map((os) => ({ ...result, os })),
);

describe('resultado con foco y anuncio', () => {
  it.each(BY_PLATFORM)(
    'el título es encabezado, recibe el foco y se anuncia ($os, $name)',
    async ({ os, attempt, title }) => {
      const announce = spyOnAnnouncements(os);
      const focusedNodes = spyOnFocusedNodes();
      await renderResult(attempt);

      const heading = screen.getByRole('header', { name: title });
      expect(focusedNodes()).toEqual([expect.objectContaining({ accessibilityRole: 'header', children: title })]);

      if (os === 'ios') {
        expect(announce).toHaveBeenCalledTimes(1);
        expect(announce).toHaveBeenCalledWith(title);
      } else {
        expect(announce).not.toHaveBeenCalled();
        expect(heading).toHaveProp('accessibilityLiveRegion', 'polite');
      }
    },
  );

  it('el foco y el anuncio ocurren solo al montar, no al volver a pintar', async () => {
    const announce = spyOnAnnouncements('ios');
    const focusedNodes = spyOnFocusedNodes();
    const { attempt } = CASES[0];
    await renderResult(attempt);
    await screen.rerender(<TransferResult attempt={{ ...attempt, finishedAt: 1 }} onHome={jest.fn()} />);

    expect(focusedNodes()).toHaveLength(1);
    expect(announce).toHaveBeenCalledTimes(1);
  });
});

describe('resultado con importes hablados', () => {
  it.each(CASES)('los importes se leen hablados ($name)', async ({ attempt, lines, spoken }) => {
    await renderResult(attempt);

    for (const { line, says } of spoken) {
      const amountLine = screen.getByText(line);
      expect(amountLine).toHaveProp('accessibilityLabel', says);
      expect(amountLine).toHaveAccessibleName(says);
      expect(screen.getByLabelText(says)).toBe(amountLine);
    }

    const plainLines = lines.filter((line) => !spoken.some(({ line: amountLine }) => amountLine === line));
    for (const line of plainLines) {
      expect(screen.getByText(line).props.accessibilityLabel).toBeUndefined();
    }
  });
});

describe('resultado con botón de salida', () => {
  it.each(CASES)('Volver al inicio avisa con onHome ($name)', async ({ attempt }) => {
    const onHome = jest.fn();
    await renderResult(attempt, onHome);

    const button = screen.getByRole('button', { name: 'Volver al inicio' });
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(within(button).getByTestId('button-gradient')).toBeOnTheScreen();
    expect(onHome).not.toHaveBeenCalled();

    await userEvent.setup().press(button);

    expect(onHome).toHaveBeenCalledTimes(1);
  });
});
