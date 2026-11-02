import { screen, testRouter } from 'expo-router/testing-library';

import type { TransferDraft } from '@/features/transfers/types';
import { treeIndex } from '@/test/a11yTree';
import { spyOnFocusEvents } from '@/test/focus';
import { settleRequests } from '@/test/homeHelpers';
import {
  chooseDate,
  fillValidForm,
  letPickerClose,
  openConfirmation,
  renderTransferFlow,
  transferRequests,
} from '@/test/transferHelpers';
import { pressButton } from '@/test/transferSessionHelpers';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

const NBSP = ' ';

const CPF_TODAY: TransferDraft = {
  cents: 125000,
  currency: 'USD',
  document: '12345678900',
  date: { year: 2026, month: 10, day: 31 },
};

const CNPJ_SCHEDULED: TransferDraft = {
  cents: 50,
  currency: 'USD',
  document: '12345678000190',
  date: { year: 2026, month: 11, day: 15 },
};

afterEach(jest.restoreAllMocks);

async function openForm() {
  await renderTransferFlow();
  await settleRequests();
}

describe('ConfirmTransferScreen: resumen', () => {
  it.each([
    {
      name: 'CPF hoy',
      draft: CPF_TODAY,
      amount: `US$${NBSP}1.250,00`,
      recipient: 'CPF 123.456.789-00',
      date: 'Hoy, 31/10/2026',
    },
    {
      name: 'CNPJ programada',
      draft: CNPJ_SCHEDULED,
      amount: `US$${NBSP}0,50`,
      recipient: 'CNPJ 12.345.678/0001-90',
      date: 'Programada para el 15/11/2026',
    },
  ])(
    'muestra el título, el importe, el destinatario, la fecha y las dos acciones sin enviar nada: «$name»',
    async ({ draft, amount, recipient, date }) => {
      await openForm();

      await openConfirmation(draft);
      await settleRequests();

      expect(screen).toHavePathname('/nueva-transferencia/confirmar');
      expect(screen.getByRole('header', { name: 'Confirmar transferencia' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Volver' })).toBeOnTheScreen();
      expect(screen.getByText('Vas a transferir')).toBeOnTheScreen();
      for (const text of [amount, 'Destinatario', recipient, 'Fecha', date]) {
        expect(screen.getByText(text)).toBeOnTheScreen();
      }
      expect(screen.getByRole('button', { name: 'Confirmar transferencia' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Editar datos' })).toBeOnTheScreen();
      expect(transferRequests()).toHaveLength(0);
    },
  );
});

describe('ConfirmTransferScreen: sin borrador', () => {
  it('sin borrador válido la confirmación redirige al formulario sin enviar', async () => {
    await renderTransferFlow({ link: '/nueva-transferencia/confirmar' });
    await settleRequests();

    expect(screen).toHavePathname('/nueva-transferencia');
    expect(await screen.findByRole('button', { name: 'Continuar' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Confirmar transferencia' })).not.toBeOnTheScreen();
    expect(transferRequests()).toHaveLength(0);
  });
});

describe('ConfirmTransferScreen: volver a editar', () => {
  it.each([
    { name: 'Editar datos', leave: () => pressButton('Editar datos') },
    { name: 'Volver', leave: () => pressButton('Volver') },
    { name: 'atrás del sistema', leave: () => testRouter.back('/nueva-transferencia') },
  ])('Editar datos, Volver y atrás vuelven al formulario intacto y sin errores nuevos: «$name»', async ({ leave }) => {
    await openForm();
    await fillValidForm();
    await chooseDate({ year: 2026, month: 11, day: 15 });
    await letPickerClose();
    await pressButton('Continuar');
    expect(screen).toHavePathname('/nueva-transferencia/confirmar');

    await leave();
    await settleRequests();

    expect(screen).toHavePathname('/nueva-transferencia');
    expect(screen.getByLabelText('Valor')).toHaveDisplayValue('1.250,00');
    expect(screen.getByLabelText('Documento del destinatario')).toHaveDisplayValue('123.456.789-00');
    expect(screen.getByText('15/11/2026')).toBeOnTheScreen();
    for (const hint of [/^Disponible: /, 'CPF (11 dígitos) o CNPJ (14 dígitos)', 'Elige una fecha futura para programarla.']) {
      expect(screen.getByText(hint)).toBeOnTheScreen();
    }
    expect(transferRequests()).toHaveLength(0);
  });
});

async function confirmAfterMidnight() {
  await renderTransferFlow({ now: new Date(2026, 9, 31, 23, 59, 30) });
  await settleRequests();
  await fillValidForm();
  await pressButton('Continuar');
  expect(screen.getByText('Hoy, 31/10/2026')).toBeOnTheScreen();

  jest.setSystemTime(new Date(2026, 10, 1, 0, 0, 10));
  await pressButton('Confirmar transferencia');
  await settleRequests();
}

describe('ConfirmTransferScreen: paso de la medianoche', () => {
  it('si pasa la medianoche, al confirmar no envía ninguna petición y vuelve al formulario', async () => {
    await confirmAfterMidnight();

    expect(transferRequests()).toHaveLength(0);
    expect(screen).toHavePathname('/nueva-transferencia');
  });
});

describe('ConfirmTransferScreen: paso de la medianoche en el formulario', () => {
  it('si pasa la medianoche, al confirmar no envía y vuelve al formulario con el error de fecha y el foco en ella', async () => {
    const focusEvents = spyOnFocusEvents();

    await confirmAfterMidnight();

    expect(transferRequests()).toHaveLength(0);
    expect(screen).toHavePathname('/nueva-transferencia');
    const dateField = screen.getByRole('button', { name: /^Fecha de la transferencia/ });
    const error = screen.getByText('La fecha no puede ser anterior a hoy.');
    expect(treeIndex(error)).toBeGreaterThan(treeIndex(dateField));
    expect(treeIndex(error)).toBeLessThan(treeIndex(screen.getByRole('button', { name: 'Continuar' })));
    expect(screen.queryByText('Hoy, 31/10/2026')).not.toBeOnTheScreen();
    expect(screen.getByText('31/10/2026')).toBeOnTheScreen();
    expect(focusEvents()).toEqual(['Fecha de la transferencia: 31 de octubre de 2026']);
  });
});
