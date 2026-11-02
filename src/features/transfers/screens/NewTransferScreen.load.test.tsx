import { router } from 'expo-router';
import { act, fireEvent, screen, testRouter } from 'expo-router/testing-library';

import { ERROR_MESSAGES } from '@/services/api/errors';

import { treeIndex } from '@/test/a11yTree';
import { balanceBody, balanceOk, transferOk } from '@/test/apiFixtures';
import { captureAppState } from '@/test/appStateMock';
import { reply, type Reply } from '@/test/fetchMock';
import { deferFetch, mockFetchPendingEach } from '@/test/fetchPending';
import { focusedFieldLabels, spyOnFocusEvents, watchFocus } from '@/test/focus';
import { balanceRequests, balanceResponse, settleRequests } from '@/test/homeHelpers';
import { querySpinners } from '@/test/spinners';
import { formBalanceRequests, goToConfirm, renderTransferFlow, transferSession } from '@/test/transferHelpers';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

afterEach(jest.restoreAllMocks);

describe('NewTransferScreen: carga del saldo', () => {
  it('al entrar pide el saldo una vez y muestra el skeleton del formulario sin indicador giratorio', async () => {
    await renderTransferFlow({ balance: 'pending' });

    expect(screen).toHavePathname('/nueva-transferencia');
    expect(screen.getByLabelText('Cargando…')).toBeBusy();
    expect(screen.queryByRole('progressbar')).not.toBeOnTheScreen();
    expect(querySpinners()).toHaveLength(0);
    expect(formBalanceRequests()).toHaveLength(1);
  });
});

describe('NewTransferScreen: formulario listo', () => {
  it('con el saldo muestra el formulario vacío con la fecha de hoy, sin foco y con el símbolo y lo disponible', async () => {
    watchFocus();
    const focusEvents = spyOnFocusEvents();
    await renderTransferFlow();
    await settleRequests();

    const amount = screen.getByLabelText('Valor');
    const document = screen.getByLabelText('Documento del destinatario');
    expect(amount).toHaveDisplayValue('');
    expect(document).toHaveDisplayValue('');
    expect(screen.getByText('Hoy, 31/10/2026')).toBeOnTheScreen();
    for (const input of [amount, document]) expect(input.props.autoFocus).toBeFalsy();
    expect(focusedFieldLabels()).toEqual([]);
    expect(focusEvents()).toEqual([]);
    const prefix = screen.getByText('US$');
    expect(treeIndex(prefix)).toBeLessThan(treeIndex(amount));
    expect(treeIndex(prefix)).toBeGreaterThan(treeIndex(screen.getByText('Valor', { includeHiddenElements: true })));
    expect(screen.getByText('Disponible: US$\u00a01.800,00')).toBeOnTheScreen();
  });
});

describe('NewTransferScreen: tope disponible', () => {
  it.each([
    ['1500,505', 1500.505, 'Disponible: US$\u00a01.500,50'],
    ['0', 0, 'Disponible: US$\u00a00,00'],
    ['-150', -150, 'Disponible: -US$\u00a0150,00'],
  ])('la ayuda muestra el tope truncado, cero o negativo: «%s»', async (_case, amount, hint) => {
    await renderTransferFlow({ balance: reply(200, balanceBody(amount, 'USD')) });
    await settleRequests();

    expect(screen.getByText(hint)).toBeOnTheScreen();
  });
});

const GREETING = `Hola, ${transferSession.user.name}`;
const NETWORK = ERROR_MESSAGES.network;
const STALE_AVAILABLE = 'Disponible: US$\u00a09.999,00';

type Leave = () => Promise<void>;

const pressBack: Leave = async () => {
  await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
};
const backGesture: Leave = () => testRouter.back('/');

const leaveCases: [string, Reply, Leave][] = [
  ['skeleton con el botón', 'pending', pressBack],
  ['skeleton con el gesto de atrás', 'pending', backGesture],
  ['aviso con el botón', 'networkError', pressBack],
  ['aviso con el gesto de atrás', 'networkError', backGesture],
];

async function openFormAgain() {
  await fireEvent.press(screen.getByRole('button', { name: 'Nueva transferencia' }));
  expect(screen).toHavePathname('/nueva-transferencia');
}

describe('NewTransferScreen: salir mientras falta el saldo', () => {
  it.each(leaveCases)('Volver desde el skeleton o el aviso lleva al Inicio: «%s»', async (_case, balance, leave) => {
    await renderTransferFlow({ balance });
    if (balance === 'networkError') {
      await settleRequests();
      expect(screen.getByText(NETWORK)).toBeOnTheScreen();
    } else {
      expect(screen.getByLabelText('Cargando…')).toBeBusy();
    }

    await leave();

    expect(screen).toHavePathname('/');
    expect(screen.getByRole('header', { name: GREETING })).toBeOnTheScreen();
    expect(router.canGoBack()).toBe(false);
  });
});

describe('NewTransferScreen: respuestas tras salir', () => {
  it.each([
    ['éxito con otra cifra', true],
    ['sin red', false],
  ])('una respuesta que llega tras salir no cambia nada, tampoco en un formulario abierto después: «%s»', async (_case, ok) => {
    const stale = deferFetch();
    jest
      .spyOn(global, 'fetch')
      .mockImplementationOnce(async () => balanceResponse(1800))
      .mockImplementationOnce(() => stale.promise);
    await renderTransferFlow({ balance: 'pending' });
    await pressBack();
    await openFormAgain();

    await act(async () => {
      if (ok) stale.resolve(balanceResponse(9999));
      else stale.reject(new TypeError('Network request failed'));
      await jest.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByLabelText('Cargando…')).toBeBusy();
    expect(screen.queryByText(STALE_AVAILABLE, { includeHiddenElements: true })).toBeNull();
    expect(screen.queryByText('US$\u00a09.999,00', { includeHiddenElements: true })).toBeNull();
    expect(screen.queryByText(NETWORK, { includeHiddenElements: true })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
  });
});

describe('NewTransferScreen: volver a entrar', () => {
  it('al volver a entrar enseguida el formulario hace una sola petición y muestra su resultado', async () => {
    await renderTransferFlow({ balance: 'pending' });
    await pressBack();
    const pending = mockFetchPendingEach();
    const before = balanceRequests().length;

    await openFormAgain();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
    });
    expect(balanceRequests().slice(before)).toHaveLength(1);

    await act(async () => {
      // Desde que se instaló la red pendiente, la única petición es la del formulario nuevo.
      pending.resolve(0, 200, balanceOk);
      await jest.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText('Disponible: US$\u00a01.800,00')).toBeOnTheScreen();
    expect(balanceRequests().slice(before)).toHaveLength(1);
  });
});

// Cada caso deja la app en un punto del flujo con el saldo del formulario ya respondido.
const foregroundCases: [string, () => Promise<void>][] = [
  ['formulario listo', () => renderTransferFlow().then(settleRequests)],
  ['aviso de error', () => renderTransferFlow({ balance: 'networkError' }).then(settleRequests)],
  [
    'confirmación',
    async () => {
      await renderTransferFlow();
      await settleRequests();
      await goToConfirm();
    },
  ],
  [
    'resultado',
    async () => {
      await renderTransferFlow({ transfer: reply(200, transferOk) });
      await settleRequests();
      await goToConfirm();
      await fireEvent.press(screen.getByRole('button', { name: 'Confirmar transferencia' }));
      await settleRequests();
    },
  ],
];

describe('NewTransferScreen: vuelta del segundo plano', () => {
  it.each(foregroundCases)('volver del segundo plano no vuelve a pedir el saldo del formulario: «%s»', async (_case, reach) => {
    const appState = captureAppState();
    await reach();
    const before = balanceRequests().length;

    await appState.emit('background');
    await appState.emit('active');
    await settleRequests();

    expect(balanceRequests()).toHaveLength(before);
    expect(formBalanceRequests()).toHaveLength(1);
  });
});
