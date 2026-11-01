import type { Transfer } from '@/services/api/types';
import type { CalendarDate } from '@/utils/date';

import { documentText, toTransferRow } from './transferRow';

const NO_BREAK_SPACE = ' ';
const today: CalendarDate = { year: 2026, month: 10, day: 31 };

const messi: Transfer = {
  payeeName: 'Lionel Andres Messi',
  payeeDocument: '11029920288',
  amount: 3500,
  currency: 'USD',
  date: { year: 2024, month: 6, day: 12 },
};
const ana: Transfer = {
  ...messi,
  payeeName: 'Ana Souza',
  payeeDocument: '12345',
  amount: 250,
  currency: 'BRL',
};

function rowOf(transfer: Transfer, receivedIndex = 0) {
  return toTransferRow({ transfer, receivedIndex }, today);
}

describe('documentText', () => {
  it.each([
    { received: '11029920288', shown: 'CPF 110.299.202-88' },
    { received: '12345678000190', shown: 'CNPJ 12.345.678/0001-90' },
    { received: '120.199.101-77', shown: 'CPF 120.199.101-77' },
    { received: '120 199 101 77', shown: 'CPF 120.199.101-77' },
    { received: '12.345.678/0001-90', shown: 'CNPJ 12.345.678/0001-90' },
    { received: '12345', shown: 'Documento 12345' },
    { received: '1234567890', shown: 'Documento 1234567890' },
    { received: '123456789012', shown: 'Documento 123456789012' },
    { received: 'AB-12', shown: 'Documento AB-12' },
    { received: '12.345', shown: 'Documento 12.345' },
    { received: '1234567890123456', shown: 'Documento 1234567890123456' },
  ])('el documento se muestra según cuántos dígitos tiene', ({ received, shown }) => {
    expect(documentText(received)).toBe(shown);
  });
});

describe('toTransferRow con los datos de la fila', () => {
  it.each([
    {
      transfer: messi,
      name: 'Lionel Andres Messi',
      detail: 'CPF 110.299.202-88 · 12/06/2024',
      amount: `US$${NO_BREAK_SPACE}3.500,00`,
    },
    {
      transfer: ana,
      name: 'Ana Souza',
      detail: 'Documento 12345 · 12/06/2024',
      amount: `R$${NO_BREAK_SPACE}250,00`,
    },
  ])(
    'la fila lleva nombre, documento, fecha e importe en su moneda',
    ({ transfer, name, detail, amount }) => {
      expect(rowOf(transfer)).toMatchObject({ name, detail, amount });
    },
  );

  it('dos transferencias idénticas tienen claves distintas', () => {
    const first = rowOf(messi, 0);
    const second = rowOf({ ...messi }, 1);

    expect(first.key).not.toBe(second.key);
  });
});

describe('toTransferRow con la fecha de hoy', () => {
  it.each([
    { date: { year: 2026, month: 10, day: 30 }, scheduled: false },
    { date: { year: 2026, month: 10, day: 31 }, scheduled: false },
    { date: { year: 2026, month: 11, day: 1 }, scheduled: true },
    { date: { year: 2024, month: 6, day: 12 }, scheduled: false },
  ])('solo una fecha posterior a hoy es programada', ({ date, scheduled }) => {
    expect(rowOf({ ...messi, date }).scheduled).toBe(scheduled);
  });
});

describe('toTransferRow con la etiqueta hablada', () => {
  const anaInDollars: Transfer = { ...ana, currency: 'USD' };

  it.each([
    {
      transfer: messi,
      label:
        'Transferencia a Lionel Andres Messi, CPF 110.299.202-88, 3.500,00 dólares, 12 de junio de 2024',
    },
    {
      transfer: anaInDollars,
      label: 'Transferencia a Ana Souza, Documento 12345, 250,00 dólares, 12 de junio de 2024',
    },
    {
      transfer: { ...messi, payeeDocument: '120.199.101-77' },
      label:
        'Transferencia a Lionel Andres Messi, CPF 120.199.101-77, 3.500,00 dólares, 12 de junio de 2024',
    },
    {
      transfer: { ...messi, date: { year: 2026, month: 11, day: 1 } },
      label:
        'Transferencia a Lionel Andres Messi, CPF 110.299.202-88, 3.500,00 dólares, 1 de noviembre de 2026, programada',
    },
    {
      transfer: { ...messi, date: { year: 2026, month: 10, day: 31 } },
      label:
        'Transferencia a Lionel Andres Messi, CPF 110.299.202-88, 3.500,00 dólares, 31 de octubre de 2026',
    },
  ])(
    'la etiqueta de la fila dice destinatario, documento, importe y fecha hablados',
    ({ transfer, label }) => {
      expect(rowOf(transfer).spokenLabel).toBe(label);
    },
  );
});
