import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { TransferSummary } from '@/features/transfers/components/TransferSummary';
import type { TransferDraft } from '@/features/transfers/types';
import { colors, spacing, typography } from '@/theme';
import type { CalendarDate } from '@/utils/date';

const NBSP = ' ';
const TODAY: CalendarDate = { year: 2026, month: 10, day: 31 };
const NEXT_MONTH: CalendarDate = { year: 2026, month: 11, day: 15 };

function draftOn(date: CalendarDate): TransferDraft {
  return { cents: 125000, currency: 'USD', document: '12345678900', date };
}

// Cada caso: borrador, importe visible, fecha visible y lo que anuncia el lector.
const CASES = [
  {
    name: 'hoy',
    draft: draftOn(TODAY),
    date: 'Hoy, 31/10/2026',
    spoken:
      'Vas a transferir 1.250,00 dólares al CPF 123.456.789-00, hoy, 31 de octubre de 2026',
  },
  {
    name: 'programada',
    draft: draftOn(NEXT_MONTH),
    date: 'Programada para el 15/11/2026',
    spoken:
      'Vas a transferir 1.250,00 dólares al CPF 123.456.789-00, programada para el 15 de noviembre de 2026',
  },
];

afterEach(() => {
  jest.restoreAllMocks();
});

it.each(CASES)(
  'el resumen es un único elemento con su etiqueta hablada ($name)',
  async ({ draft, date, spoken }) => {
    await render(<TransferSummary draft={draft} today={TODAY} />);

    const summaries = screen.queryAllByLabelText(/^Vas a transferir/);
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toHaveAccessibleName(spoken);
    expect(summaries[0]).toHaveProp('accessible', true);

    expect(screen.getByText('Vas a transferir')).toBeOnTheScreen();
    expect(screen.getByText(`US$${NBSP}1.250,00`)).toBeOnTheScreen();
    expect(screen.getByText('Destinatario')).toBeOnTheScreen();
    expect(screen.getByText('CPF 123.456.789-00')).toBeOnTheScreen();
    expect(screen.getByText('Fecha')).toBeOnTheScreen();
    expect(screen.getByText(date)).toBeOnTheScreen();
  },
);

it('el resumen usa la tipografía, los colores y la separación del diseño y deja que el importe ocupe varias líneas', async () => {
  await render(<TransferSummary draft={draftOn(TODAY)} today={TODAY} />);

  expect(screen.getByText('Vas a transferir')).toHaveStyle({
    ...typography.body,
    color: colors.textSecondary,
  });

  const amount = screen.getByText(`US$${NBSP}1.250,00`);
  expect(amount).toHaveStyle({ ...typography.h1, color: colors.textStrong });
  expect(amount.props.numberOfLines).toBeUndefined();

  for (const caption of ['Destinatario', 'Fecha']) {
    expect(screen.getByText(caption)).toHaveStyle({
      ...typography.caption,
      color: colors.textSecondary,
    });
  }
  for (const value of ['CPF 123.456.789-00', 'Hoy, 31/10/2026']) {
    expect(screen.getByText(value)).toHaveStyle({ ...typography.label, color: colors.text });
  }

  // Entre el importe y «Destinatario» van 24; entre las dos filas, 16.
  const recipientRow = screen.getByText('Destinatario').parent;
  const rows = recipientRow?.parent;
  expect(rows).toHaveStyle({ gap: spacing.md });
  expect(rows).toBe(screen.getByText('Fecha').parent?.parent);
  expect(rows?.parent).toBe(screen.getByLabelText(/^Vas a transferir/));
  expect(rows?.parent).toHaveStyle({ gap: spacing.xl });
});

it('sin tarjeta ni sombra', async () => {
  await render(<TransferSummary draft={draftOn(TODAY)} today={TODAY} />);

  const [summary] = screen.queryAllByLabelText(/^Vas a transferir/);
  expect(summary).toBeDefined();

  const styles = [summary, ...summary.queryAll(() => true)].map((node) =>
    StyleSheet.flatten(node.props.style),
  );
  for (const style of styles) {
    expect(style ?? {}).not.toHaveProperty('backgroundColor');
    expect(style ?? {}).not.toHaveProperty('borderRadius');
    expect(style ?? {}).not.toHaveProperty('borderWidth');
    expect(style ?? {}).not.toHaveProperty('elevation');
    expect(style ?? {}).not.toHaveProperty('shadowOpacity');
    expect(style ?? {}).not.toHaveProperty('boxShadow');
  }
});
