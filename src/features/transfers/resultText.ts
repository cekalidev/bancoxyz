import { centsToAmount } from '@/utils/amountInput';
import { formatDisplayDate } from '@/utils/date';
import { formatMoney } from '@/utils/money';
import { spokenMoney } from '@/utils/spokenMoney';

import { documentLabel } from './transferText';
import type { TransferAttempt, TransferDraft } from './types';

// Las líneas de datos del incierto se muestran como etiqueta; sin `kind` son texto de cuerpo.
export type ResultLine = { text: string; spoken?: string; kind?: 'body' | 'label' };
export type ResultTexts = { tone: 'success' | 'warning'; title: string; lines: ResultLine[] };

function amountParts({ cents, currency }: TransferDraft): { text: string; spoken: string } {
  const amount = centsToAmount(cents);

  return { text: formatMoney(amount, currency), spoken: spokenMoney(amount, currency) };
}

function payeeLine(verb: string, draft: TransferDraft, suffix: string): ResultLine {
  const money = amountParts(draft);
  const payee = documentLabel(draft.document);

  return {
    text: `${verb} ${money.text} al ${payee}${suffix}`,
    spoken: `${verb} ${money.spoken} al ${payee}${suffix}`,
  };
}

function dateLine({ date }: TransferDraft): ResultLine {
  return { text: `Fecha: ${formatDisplayDate(date)}` };
}

function asData(line: ResultLine): ResultLine {
  return { ...line, kind: 'label' };
}

function immediateTexts(draft: TransferDraft): ResultTexts {
  return {
    tone: 'success',
    title: 'Transferencia realizada',
    lines: [payeeLine('Enviaste', draft, '.'), dateLine(draft)],
  };
}

function scheduledTexts(draft: TransferDraft): ResultTexts {
  return {
    tone: 'success',
    title: 'Transferencia programada',
    lines: [payeeLine('Se enviarán', draft, ` el ${formatDisplayDate(draft.date)}.`)],
  };
}

function uncertainTexts(draft: TransferDraft): ResultTexts {
  const money = amountParts(draft);

  return {
    tone: 'warning',
    title: 'No pudimos confirmar si la transferencia se realizó',
    lines: [
      { text: 'Puede que se haya hecho. Antes de volver a enviarla, compruébala con estos datos:' },
      asData({ text: `Valor: ${money.text}`, spoken: `Valor: ${money.spoken}` }),
      asData({ text: `Destinatario: ${documentLabel(draft.document)}` }),
      asData(dateLine(draft)),
    ],
  };
}

export function resultTexts({ draft, outcome }: TransferAttempt): ResultTexts {
  switch (outcome) {
    case 'scheduled':
      return scheduledTexts(draft);
    case 'uncertain':
      return uncertainTexts(draft);
    case 'immediate':
      return immediateTexts(draft);
  }
}
