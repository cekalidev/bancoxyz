import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { TransferResult } from '@/features/transfers/components/TransferResult';
import type { FinishedOutcome, TransferAttempt } from '@/features/transfers/types';
import { layout, spacing } from '@/theme';

const NBSP = ' ';
const DATE = { year: 2026, month: 10, day: 31 };
const PARAGRAPH = 'Puede que se haya hecho. Antes de volver a enviarla, compruébala con estos datos:';
const DATA_LINES = [`Valor: US$${NBSP}1.250,00`, 'Destinatario: CPF 123.456.789-00', 'Fecha: 31/10/2026'];

async function renderOutcome(outcome: FinishedOutcome) {
  const attempt: TransferAttempt = {
    draft: { cents: 125000, currency: 'USD', document: '12345678900', date: DATE },
    outcome,
    finishedAt: 0,
  };

  await render(<TransferResult attempt={attempt} onHome={jest.fn()} />);
}

function marginTopOf(text: string) {
  return StyleSheet.flatten(screen.getByText(text).props.style).marginTop;
}

describe('resultado con espacios', () => {
  it.each<FinishedOutcome>(['immediate', 'scheduled', 'uncertain'])(
    'deja 32 dp entre la cabecera y el icono (%s)',
    async (outcome) => {
      await renderOutcome(outcome);

      expect(layout.screenPadding + spacing.sm).toBe(32);
      expect(screen.root).toHaveStyle({ paddingTop: spacing.sm });
    },
  );

  it('separa el párrafo del incierto de sus datos con un margen en la primera línea de datos', async () => {
    await renderOutcome('uncertain');

    expect(marginTopOf(DATA_LINES[0])).toBe(spacing.sm);
    expect(marginTopOf(PARAGRAPH)).toBeUndefined();
    for (const line of DATA_LINES.slice(1)) {
      expect(marginTopOf(line)).toBeUndefined();
    }
  });

  it.each<FinishedOutcome>(['immediate', 'scheduled'])(
    'no añade margen entre las líneas del texto (%s)',
    async (outcome) => {
      await renderOutcome(outcome);

      const margins = screen.getAllByText(/.+/).map((node) => StyleSheet.flatten(node.props.style).marginTop);
      expect(margins.every((margin) => margin === undefined)).toBe(true);
    },
  );
});
