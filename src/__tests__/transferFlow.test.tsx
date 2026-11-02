import { router } from 'expo-router';
import { act, fireEvent, screen } from 'expo-router/testing-library';
import { Alert } from 'react-native';

import { balanceOk, loginOk, transferOk } from '@/test/apiFixtures';
import { mockApiRoutes, reply, type Reply } from '@/test/fetchMock';
import { balanceRequests, balanceResponse, holdNextResponse, settleRequests } from '@/test/homeHelpers';
import { prepareSessionTest, renderApp, seedSession } from '@/test/sessionHelpers';
import { chooseDate, fillValidForm, goToConfirm, letPickerClose, TRANSFER_NOW } from '@/test/transferHelpers';
import { pressButton } from '@/test/transferSessionHelpers';
import type { CalendarDate } from '@/utils/date';

jest.mock('expo-font', () => ({ useFonts: jest.fn(() => [true, null]) }));

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

beforeEach(() => {
  prepareSessionTest();
  seedSession(loginOk);
  jest.useFakeTimers().setSystemTime(TRANSFER_NOW);
});
afterEach(jest.restoreAllMocks);

// Abre la app con sesión guardada y entra al formulario desde el Inicio.
async function openFormFromApp(transfer: Reply = reply(200, transferOk)) {
  mockApiRoutes({ balance: reply(200, balanceOk), transfer });
  await renderApp('/');
  await fireEvent.press(await screen.findByRole('button', { name: 'Nueva transferencia' }));
  await settleRequests();
}

type Attempt = { transfer: Reply; date?: CalendarDate };

// Abre la app con sesión guardada, rellena el formulario y confirma hasta llegar al resultado.
async function sendFromApp({ transfer, date }: Attempt) {
  mockApiRoutes({ balance: reply(200, balanceOk), transfer });
  await renderApp('/');
  await fireEvent.press(await screen.findByRole('button', { name: 'Nueva transferencia' }));
  await settleRequests();
  await fillValidForm();
  if (date) {
    await chooseDate(date);
    await letPickerClose();
  }
  await pressButton('Continuar');
  await pressButton('Confirmar transferencia');
  await settleRequests();
}

const RESULTS = [
  { name: 'realizada', title: 'Transferencia realizada', attempt: { transfer: reply(200, transferOk) } },
  {
    name: 'programada',
    title: 'Transferencia programada',
    attempt: { transfer: reply(200, transferOk), date: { year: 2026, month: 11, day: 15 } },
  },
  {
    name: 'incierto',
    title: 'No pudimos confirmar si la transferencia se realizó',
    attempt: { transfer: reply(500, {}) },
  },
];

const EXITS = [
  { exit: 'Volver al inicio', leave: () => pressButton('Volver al inicio') },
  { exit: 'el atrás del sistema', leave: () => act(() => router.back()) },
];

const CASES = RESULTS.flatMap((result) => EXITS.map((exit) => ({ ...result, ...exit })));

describe('flujo de la transferencia: salida del resultado', () => {
  it.each(CASES)(
    'Volver al inicio y el atrás del sistema desde el resultado llevan al Inicio y no a la confirmación ni al formulario ($name, $exit)',
    async ({ title, attempt, leave }) => {
      await sendFromApp(attempt);
      expect(screen).toHavePathname('/nueva-transferencia/resultado');
      expect(screen.getByRole('header', { name: title })).toBeOnTheScreen();

      await leave();
      await settleRequests();

      expect(screen).toHavePathname('/');
      expect(router.canGoBack()).toBe(false);
      expect(screen.getByRole('button', { name: 'Nueva transferencia' })).toBeOnTheScreen();
    },
  );
});

describe('flujo de la transferencia: pila del formulario', () => {
  it('la confirmación se abre sobre el formulario, que sigue debajo con sus datos', async () => {
    await openFormFromApp();

    await goToConfirm();
    expect(screen).toHavePathname('/nueva-transferencia/confirmar');
    await act(() => router.back());

    expect(screen).toHavePathname('/nueva-transferencia');
    expect(screen.getByLabelText('Valor')).toHaveDisplayValue('1.250,00');
    expect(screen.getByLabelText('Documento del destinatario')).toHaveDisplayValue('123.456.789-00');
  });
});

describe('flujo de la transferencia: un formulario nuevo descarta el resultado', () => {
  it('abrir Nueva transferencia descarta el resultado anterior: un enlace directo al resultado lleva al Inicio', async () => {
    await sendFromApp({ transfer: reply(200, transferOk) });
    await pressButton('Volver al inicio');
    await settleRequests();
    await pressButton('Nueva transferencia');
    await settleRequests();

    await act(() => router.push('/nueva-transferencia/resultado'));
    await settleRequests();

    expect(screen).toHavePathname('/');
    expect(screen.queryByRole('header', { name: 'Transferencia realizada' })).toBeNull();
  });
});

const FORM_EXITS = [
  { exit: 'botón Volver', leave: () => pressButton('Volver') },
  { exit: 'atrás del sistema', leave: () => act(() => router.back()) },
];

const DUPLICATE_NOTICE = /^Ya enviaste una transferencia igual/;

describe('flujo de la transferencia: salir del formulario', () => {
  it.each(FORM_EXITS)(
    'Volver o atrás desde el formulario con datos vuelve al Inicio sin preguntar y al reabrir está vacío ($exit)',
    async ({ leave }) => {
      const alert = jest.spyOn(Alert, 'alert');
      await openFormFromApp();
      await fillValidForm();

      await leave();
      await settleRequests();
      expect(screen).toHavePathname('/');
      expect(alert).not.toHaveBeenCalled();
      await pressButton('Nueva transferencia');
      await settleRequests();

      expect(screen.getByLabelText('Valor')).toHaveDisplayValue('');
      expect(screen.getByLabelText('Documento del destinatario')).toHaveDisplayValue('');
    },
  );

  it('salir del formulario no borra el registro de intentos', async () => {
    await sendFromApp({ transfer: reply(200, transferOk) });
    await pressButton('Volver al inicio');
    await settleRequests();
    await pressButton('Nueva transferencia');
    await settleRequests();
    await fillValidForm();
    await pressButton('Volver');
    await settleRequests();

    await pressButton('Nueva transferencia');
    await settleRequests();
    await goToConfirm();

    expect(screen.getByText(DUPLICATE_NOTICE)).toBeOnTheScreen();
  });
});

describe('flujo de la transferencia: después de un éxito', () => {
  it('tras un éxito el formulario se abre vacío y solo el aviso conserva el intento', async () => {
    await sendFromApp({ transfer: reply(200, transferOk) });
    await pressButton('Volver al inicio');
    await settleRequests();

    await pressButton('Nueva transferencia');
    await settleRequests();

    expect(screen.getByLabelText('Valor')).toHaveDisplayValue('');
    expect(screen.getByLabelText('Documento del destinatario')).toHaveDisplayValue('');
    await goToConfirm();
    expect(screen.getByText(DUPLICATE_NOTICE)).toBeOnTheScreen();
  });
});

const NBSP = '\u00a0';

describe('flujo de la transferencia: vuelta al Inicio', () => {
  // Solo se exige que el Inicio pida al menos una vez: cerrar el resultado pasa por el Inicio y puede
  // pedir el saldo más de una vez durante la transición.
  it('el Inicio vuelve a pedir el saldo sin skeleton', async () => {
    await sendFromApp({ transfer: reply(200, transferOk) });
    const before = balanceRequests().length;
    const refresh = holdNextResponse();

    await pressButton('Volver al inicio');
    await act(() => jest.advanceTimersByTimeAsync(0));

    expect(screen).toHavePathname('/');
    expect(balanceRequests().length).toBeGreaterThan(before);
    expect(screen.getByText(`US$${NBSP}1.800,00`)).toBeOnTheScreen();
    expect(screen.queryByLabelText('Cargando…')).toBeNull();
    await act(async () => refresh.resolve(balanceResponse(550)));
    await settleRequests();
    expect(screen.getByText(`US$${NBSP}550,00`)).toBeOnTheScreen();
  });

  it('al reabrir Nueva transferencia el formulario está vacío con hoy y pide el saldo', async () => {
    await sendFromApp({ transfer: reply(200, transferOk) });
    await pressButton('Volver al inicio');
    await settleRequests();
    const before = balanceRequests().length;

    await pressButton('Nueva transferencia');
    await settleRequests();

    expect(balanceRequests()).toHaveLength(before + 1);
    expect(screen.getByLabelText('Valor')).toHaveDisplayValue('');
    expect(screen.getByLabelText('Documento del destinatario')).toHaveDisplayValue('');
    expect(screen.getByRole('button', { name: 'Fecha de la transferencia: hoy, 31 de octubre de 2026' })).toBeOnTheScreen();
  });
});
