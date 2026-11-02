import { screen } from 'expo-router/testing-library';

import type { FinishedOutcome, TransferAttempt } from '@/features/transfers/types';
import { accessibleOrder, exposedStrings, treeIndex } from '@/test/a11yTree';
import { spyOnFocusedNodes } from '@/test/focus';
import { settleRequests } from '@/test/homeHelpers';
import { openResult, renderTransferFlow, TRANSFER_NOW } from '@/test/transferHelpers';
import type { CalendarDate } from '@/utils/date';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

const TODAY: CalendarDate = { year: 2026, month: 10, day: 31 };
const NEXT_MONTH: CalendarDate = { year: 2026, month: 11, day: 15 };
const NBSP = ' ';
const MONEY = `US$${NBSP}1.250,00`;

function attemptOf(outcome: FinishedOutcome, date: CalendarDate): TransferAttempt {
  return {
    draft: { cents: 125000, currency: 'USD', document: '12345678900', date },
    outcome,
    finishedAt: TRANSFER_NOW.getTime(),
  };
}

const IMMEDIATE = attemptOf('immediate', TODAY);

// Cada resultado con su título.
const RESULTS = [
  {
    name: 'realizada',
    attempt: IMMEDIATE,
    title: 'Transferencia realizada',
    lines: [`Enviaste ${MONEY} al CPF 123.456.789-00.`, 'Fecha: 31/10/2026'],
  },
  {
    name: 'programada',
    attempt: attemptOf('scheduled', NEXT_MONTH),
    title: 'Transferencia programada',
    lines: [`Se enviarán ${MONEY} al CPF 123.456.789-00 el 15/11/2026.`],
  },
  {
    name: 'incierto',
    attempt: attemptOf('uncertain', TODAY),
    title: 'No pudimos confirmar si la transferencia se realizó',
    lines: [
      'Puede que se haya hecho. Antes de volver a enviarla, compruébala con estos datos:',
      `Valor: ${MONEY}`,
      'Destinatario: CPF 123.456.789-00',
      'Fecha: 31/10/2026',
    ],
  },
];

afterEach(jest.restoreAllMocks);

// Abre el Inicio con sesión y, encima, el resultado del intento dado.
async function showResult(attempt: TransferAttempt) {
  await renderTransferFlow({ link: '/' });
  await settleRequests();
  await openResult(attempt);
  await settleRequests();
}

describe('TransferResultScreen: cabecera', () => {
  it('la cabecera dice Transferencia sin Volver', async () => {
    await showResult(IMMEDIATE);

    expect(screen).toHavePathname('/nueva-transferencia/resultado');
    expect(screen.getByRole('header', { name: 'Transferencia' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Transferencia realizada' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Volver' })).not.toBeOnTheScreen();
  });
});

describe('TransferResultScreen: sin intento', () => {
  it('sin intento terminado el resultado va al Inicio', async () => {
    await renderTransferFlow({ link: '/nueva-transferencia/resultado' });
    await settleRequests();

    expect(screen).toHavePathname('/');
    expect(await screen.findByRole('button', { name: 'Nueva transferencia' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Volver al inicio' })).not.toBeOnTheScreen();
  });
});

describe('TransferResultScreen: foco', () => {
  it.each(RESULTS)('al llegar al resultado el título recibe el foco ($name)', async ({ attempt, title }) => {
    await renderTransferFlow({ link: '/' });
    await settleRequests();
    const focusedNodes = spyOnFocusedNodes();

    await openResult(attempt);
    await settleRequests();

    expect(screen.getByRole('header', { name: title })).toBeOnTheScreen();
    expect(focusedNodes()).toEqual([expect.objectContaining({ accessibilityRole: 'header', children: title })]);
  });
});

// El Inicio sigue montado debajo: el resultado empieza en el logo de su cabecera.
function resultReadingOrder() {
  const order = accessibleOrder();
  return order.slice(order.lastIndexOf('BancoXYZ'));
}

describe('TransferResultScreen: orden de lectura', () => {
  it.each(RESULTS)(
    'el orden del resultado es cabecera, título, datos y Volver al inicio ($name)',
    async ({ attempt, title, lines }) => {
      await showResult(attempt);

      expect(resultReadingOrder()).toEqual(['BancoXYZ', 'Transferencia', title, 'Volver al inicio']);
      // Las líneas no son elementos accesibles propios: se comprueban por su posición en el árbol.
      const positions = [
        screen.getByRole('header', { name: title }),
        ...lines.map((line) => screen.getByText(line)),
        screen.getByRole('button', { name: 'Volver al inicio' }),
      ].map(treeIndex);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
      expect(new Set(positions).size).toBe(positions.length);
    },
  );
});

// Palabras con las que un texto prometería el saldo ya actualizado o la transferencia en el listado.
const PROMISES = [/saldo/i, /actualiz/i, /listado/i, /transferencias/i, /historial/i, /movimientos/i];

// Cadenas del resultado: desde el título de su cabecera; el Inicio, montado debajo, va antes.
function resultStrings() {
  const strings = exposedStrings();
  return strings.slice(strings.lastIndexOf('Transferencia'));
}

describe('TransferResultScreen: sin promesas', () => {
  it.each(RESULTS)('ningún texto promete saldo actualizado ni el listado ($name)', async ({ attempt, title }) => {
    await showResult(attempt);
    const strings = resultStrings();

    expect(strings).toEqual(expect.arrayContaining(['Transferencia', title, 'Volver al inicio']));
    expect(strings.filter((text) => PROMISES.some((promise) => promise.test(text)))).toEqual([]);
  });
});
