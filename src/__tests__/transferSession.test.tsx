import { screen } from 'expo-router/testing-library';

import { finishAttempt } from '@/features/transfers/transferActions';
import { INITIAL_TRANSFER_STATE, useTransferStore } from '@/features/transfers/transferStore';
import type { TransferDraft } from '@/features/transfers/types';
import { ERROR_MESSAGES } from '@/services/api/errors';
import { loginOk, sessionUnauthorized, transferOk } from '@/test/apiFixtures';
import { mockApiRoutes, reply } from '@/test/fetchMock';
import { settleRequests, spyOnAnnouncements } from '@/test/homeHelpers';
import { secureStoreModule } from '@/test/secureStoreMock';
import { prepareSessionTest, relaunchApp, seedSession } from '@/test/sessionHelpers';
import { TRANSFER_NOW } from '@/test/transferHelpers';
import {
  confirmSentDraft,
  DUPLICATE_NOTICE,
  openHome,
  pressButton,
  SENT_DRAFT,
  sendSentDraft,
  signIn,
  waitForHome,
} from '@/test/transferSessionHelpers';

jest.mock('expo-font', () => ({ useFonts: jest.fn(() => [true, null]) }));

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

const EXPIRED = ERROR_MESSAGES.unauthorized;
const EXPIRED_REPLY = reply(401, sessionUnauthorized);
const RESULT_TITLES = [
  'Transferencia realizada',
  'Transferencia programada',
  'No pudimos confirmar si la transferencia se realizó',
];

// Un intento anterior a otro destinatario: no provoca el aviso de duplicado.
const OTHER: TransferDraft = { ...SENT_DRAFT, document: '98765432100' };

// Todo lo que se escribió en el almacenamiento seguro simulado, claves y valores.
function secureStoreWrites(): string[] {
  return secureStoreModule.setItemAsync.mock.calls.flat();
}

beforeEach(() => {
  prepareSessionTest();
  seedSession(loginOk);
  jest.useFakeTimers().setSystemTime(TRANSFER_NOW);
});
afterEach(jest.restoreAllMocks);

describe('sesión caducada en el formulario de transferencia', () => {
  it('un 401 del saldo del formulario lleva al login con el aviso de sesión caducada y sin aviso propio', async () => {
    const announce = spyOnAnnouncements('ios');
    await openHome(EXPIRED_REPLY);
    mockApiRoutes({ balance: EXPIRED_REPLY });

    await pressButton('Nueva transferencia');
    await settleRequests();

    expect(await screen.findByText(EXPIRED)).toBeOnTheScreen();
    expect(screen).toHavePathname('/login');
    expect(screen.getAllByText(EXPIRED)).toHaveLength(1);
    expect(screen.queryByText(ERROR_MESSAGES.unknown)).toBeNull();
    const announced = announce.mock.calls.map(([message]) => message);
    expect(announced).not.toContain(ERROR_MESSAGES.unknown);
    expect(announced.filter((message) => message === EXPIRED)).toHaveLength(1);
  });
});

describe('sesión caducada al transferir', () => {
  it('un 401 al transferir lleva al login sin resultado y borra el borrador y los intentos', async () => {
    await openHome(EXPIRED_REPLY);
    finishAttempt({ draft: OTHER, outcome: 'immediate', finishedAt: Date.now() - 60000 });

    await sendSentDraft();

    expect(await screen.findByText(EXPIRED)).toBeOnTheScreen();
    expect(screen).toHavePathname('/login');
    RESULT_TITLES.forEach((title) => expect(screen.queryByRole('header', { name: title })).toBeNull());
    expect(screen.queryByRole('button', { name: 'Continuar' })).toBeNull();
    expect(useTransferStore.getState()).toEqual(INITIAL_TRANSFER_STATE);
  });
});

describe('el registro de intentos no sobrevive a la sesión', () => {
  it('tras un 401 al transferir y volver a entrar, un borrador igual no avisa', async () => {
    await openHome(EXPIRED_REPLY);
    finishAttempt({ draft: SENT_DRAFT, outcome: 'immediate', finishedAt: Date.now() - 60000 });
    await confirmSentDraft();
    expect(screen.getByText(DUPLICATE_NOTICE)).toBeOnTheScreen();
    await pressButton('Enviar otra igual');
    await settleRequests();
    expect(await screen.findByText(EXPIRED)).toBeOnTheScreen();

    await signIn();
    await confirmSentDraft();

    expect(screen).toHavePathname('/nueva-transferencia/confirmar');
    expect(screen.queryByText(DUPLICATE_NOTICE)).toBeNull();
    expect(screen.getByRole('button', { name: 'Confirmar transferencia' })).toBeOnTheScreen();
  });
});

describe('el registro de intentos vive solo en memoria', () => {
  it('tras reabrir la app no se guardó nada del intento y no hay aviso de duplicado', async () => {
    await openHome(reply(200, transferOk));
    await sendSentDraft();
    expect(screen.getByRole('header', { name: 'Transferencia realizada' })).toBeOnTheScreen();

    const written = secureStoreWrites();
    [SENT_DRAFT.document, '1250', '125000', '0.3'].forEach((fragment) =>
      written.forEach((entry) => expect(entry).not.toContain(fragment)),
    );

    await relaunchApp('/');
    await waitForHome();
    await confirmSentDraft();

    expect(screen).toHavePathname('/nueva-transferencia/confirmar');
    expect(screen.queryByText(DUPLICATE_NOTICE)).toBeNull();
  });
});
