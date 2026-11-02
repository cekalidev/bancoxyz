import { fireEvent, screen } from 'expo-router/testing-library';

import { finishAttempt } from '@/features/transfers/transferActions';
import { useTransferStore } from '@/features/transfers/transferStore';
import type { TransferDraft } from '@/features/transfers/types';
import { balanceBody, transferOk } from '@/test/apiFixtures';
import { reply, type Reply } from '@/test/fetchMock';
import { politeRegionWith, settleRequests, spyOnAnnouncements } from '@/test/homeHelpers';
import {
  chooseDate,
  goToConfirm,
  letPickerClose,
  pasteInto,
  renderTransferFlow,
  sentTransferBody,
  transferRequests,
  typeAmount,
  typeDocument,
} from '@/test/transferHelpers';
import { pressButton } from '@/test/transferSessionHelpers';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

const MINUTE = 60000;
const REJECTION = reply(400, { message: 'Bad Request: dados inválidos' });
const REJECTED = 'No pudimos hacer la transferencia. Revisa los datos e inténtalo de nuevo.';

// El borrador que deja `goToConfirm`: 1.250,00 USD al CPF de prueba con la fecha de hoy.
const SENT: TransferDraft = {
  cents: 125000,
  currency: 'USD',
  document: '12345678900',
  date: { year: 2026, month: 10, day: 31 },
};

const notice = (minutes: number) => `Ya enviaste una transferencia igual hace ${minutes} min. ¿Quieres enviar otra?`;

afterEach(jest.restoreAllMocks);

// Registra un envío con éxito del borrador que terminó hace `ms` milisegundos.
function sentAgo(ms: number, draft: TransferDraft = SENT) {
  finishAttempt({ draft, outcome: 'immediate', finishedAt: Date.now() - ms });
}

type FormReplies = { transfer?: Reply; balance?: Reply };

async function openForm({ transfer = reply(200, transferOk), balance }: FormReplies = {}) {
  await renderTransferFlow({ transfer, balance });
  await settleRequests();
}

const NOTICE_START = /^Ya enviaste una transferencia igual/;

// Texto del aviso de duplicado en pantalla, o `null` si no aparece.
function shownNotice(): unknown {
  return screen.queryByText(NOTICE_START)?.props.children ?? null;
}

const passMinutes = (minutes: number) => jest.setSystemTime(Date.now() + minutes * MINUTE);

// Sale de la confirmación con «Editar datos» y vuelve a entrar con «Continuar».
async function reenterConfirmation() {
  await pressButton('Editar datos');
  await pressButton('Continuar');
}

// Veces que se anuncia el aviso al entrar en la confirmación con un intento igual de hace 2 min.
async function noticeAnnouncements(os: 'ios' | 'android') {
  const announce = spyOnAnnouncements(os);
  await openForm();
  sentAgo(2 * MINUTE);
  await goToConfirm();
  return announce.mock.calls.filter(([text]) => text === notice(2)).length;
}

describe('ConfirmTransferScreen: aviso de duplicado', () => {
  it('con un intento igual reciente muestra el aviso anunciado y Enviar otra igual, que envía: en Android también se anuncia al entrar', async () => {
    expect(await noticeAnnouncements('android')).toBe(1);
  });

  it('con un intento igual reciente muestra el aviso anunciado y Enviar otra igual, que envía: en iOS se anuncia una sola vez al entrar', async () => {
    expect(await noticeAnnouncements('ios')).toBe(1);
  });

  it('con un intento igual reciente muestra el aviso anunciado y Enviar otra igual, que envía', async () => {
    const announce = spyOnAnnouncements('ios');
    await openForm();
    sentAgo(2 * MINUTE);

    await goToConfirm();

    expect(screen.getByText(notice(2))).toBeOnTheScreen();
    expect(announce).toHaveBeenCalledWith(notice(2));
    expect(politeRegionWith(notice(2))).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Confirmar transferencia' })).not.toBeOnTheScreen();

    await pressButton('Enviar otra igual');
    await settleRequests();

    expect(transferRequests()).toHaveLength(1);
    expect(sentTransferBody()).toEqual({
      value: 1250,
      currency: 'USD',
      payeerDocument: '12345678900',
      transferDate: '2026-10-31',
    });
    expect(screen).toHavePathname('/nueva-transferencia/resultado');
  });
});

describe('ConfirmTransferScreen: cuándo se calcula el aviso de duplicado', () => {
  it('el aviso no cambia mientras sigo en la confirmación y se recalcula al volver a entrar', async () => {
    await openForm({ transfer: REJECTION });
    sentAgo(2 * MINUTE);
    await goToConfirm();
    expect(screen.getByText(notice(2))).toBeOnTheScreen();

    passMinutes(3);
    await reenterConfirmation();
    expect(screen.getByText(notice(5))).toBeOnTheScreen();

    // Pasan los diez minutos sin salir: el rechazo vuelve a pintar la pantalla y el aviso sigue igual.
    passMinutes(6);
    await pressButton('Enviar otra igual');
    await settleRequests();
    expect(screen.getByText(REJECTED)).toBeOnTheScreen();
    expect(screen.getByText(notice(5))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Enviar otra igual' })).toBeOnTheScreen();

    await reenterConfirmation();
    expect(shownNotice()).toBeNull();
    expect(screen.getByRole('button', { name: 'Confirmar transferencia' })).toBeOnTheScreen();
  });
});

describe('ConfirmTransferScreen: ventana del aviso de duplicado', () => {
  it.each([
    { elapsed: '9:59', ms: 10 * MINUTE - 1000, expected: notice(9) },
    { elapsed: '10:00', ms: 10 * MINUTE, expected: null },
    { elapsed: '10:01', ms: 10 * MINUTE + 1000, expected: null },
  ])('avisa a los 9:59 y no a los 10:00 ni a los 10:01 desde el fin de la petición ($elapsed)', async ({ ms, expected }) => {
    await openForm();
    const finishedAt = Date.now();
    sentAgo(0);
    jest.setSystemTime(finishedAt + ms);

    await goToConfirm();

    expect(shownNotice()).toBe(expected);
    const primary = expected ? 'Enviar otra igual' : 'Confirmar transferencia';
    expect(screen.getByRole('button', { name: primary })).toBeOnTheScreen();
  });
});

// Envío de hace 2 min: 0,30 USD al CPF de prueba con la fecha de hoy.
const SMALL: TransferDraft = { ...SENT, cents: 30 };
const DOCUMENT = 'Documento del destinatario';

// Borra el último carácter del valor, como la tecla de borrar.
async function deleteLastAmountChar() {
  const input = screen.getByLabelText('Valor');
  await fireEvent.changeText(input, String(input.props.value ?? '').slice(0, -1));
}

describe('ConfirmTransferScreen: qué cuenta como igual', () => {
  it.each([
    {
      name: 'documento pegado como 123.456.789-00',
      fill: async () => {
        await typeAmount('30');
        await pasteInto(DOCUMENT, '123.456.789-00');
      },
    },
    {
      name: 'valor escrito 3-1, borrado el 1 y escrito 0',
      fill: async () => {
        await typeAmount('31');
        await deleteLastAmountChar();
        await typeAmount('0');
        await typeDocument('12345678900');
      },
    },
  ])('un documento pegado con separadores y un valor reescrito siguen siendo iguales ($name)', async ({ fill }) => {
    await openForm();
    sentAgo(2 * MINUTE, SMALL);

    await fill();
    await pressButton('Continuar');

    expect(shownNotice()).toBe(notice(2));
    expect(screen.getByRole('button', { name: 'Enviar otra igual' })).toBeOnTheScreen();
  });
});

describe('ConfirmTransferScreen: qué no cuenta como igual', () => {
  it.each([
    { name: 'otro documento', digits: '30', document: '12345678901' },
    { name: 'otro valor', digits: '31', document: '12345678900' },
    { name: 'otra moneda', digits: '30', document: '12345678900', balance: reply(200, balanceBody(1800, 'BRL')) },
    { name: 'otra fecha', digits: '30', document: '12345678900', date: { year: 2026, month: 11, day: 1 } },
  ])('otro documento, valor, moneda o fecha no avisa ($name)', async ({ digits, document, balance, date }) => {
    await openForm({ balance });
    sentAgo(2 * MINUTE, SMALL);

    await typeAmount(digits);
    await typeDocument(document);
    if (date) {
      await chooseDate(date);
      await letPickerClose();
    }
    await pressButton('Continuar');

    expect(screen).toHavePathname('/nueva-transferencia/confirmar');
    expect(shownNotice()).toBeNull();
    expect(screen.getByRole('button', { name: 'Confirmar transferencia' })).toBeOnTheScreen();
  });
});

describe('ConfirmTransferScreen: un rechazo no cuenta como envío', () => {
  // Rellena el formulario, confirma y la API responde con un 400.
  async function confirmRejected() {
    await openForm({ transfer: REJECTION });
    await goToConfirm();
    await pressButton('Confirmar transferencia');
    await settleRequests();
    expect(screen.getByText(REJECTED)).toBeOnTheScreen();
  }

  it('tras un 400 un borrador igual no avisa', async () => {
    await confirmRejected();

    await reenterConfirmation();

    expect(screen).toHavePathname('/nueva-transferencia/confirmar');
    expect(shownNotice()).toBeNull();
    expect(screen.getByRole('button', { name: 'Confirmar transferencia' })).toBeOnTheScreen();
  });

  it('un envío rechazado no deja intento en el registro', async () => {
    await confirmRejected();

    expect(transferRequests()).toHaveLength(1);
    expect(useTransferStore.getState().attempts).toEqual([]);
    expect(useTransferStore.getState().lastAttempt).toBeNull();
  });
});
