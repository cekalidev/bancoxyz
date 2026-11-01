import { screen } from 'expo-router/testing-library';

import { useTransferStore } from '@/features/transfers/transferStore';
import { ERROR_MESSAGES } from '@/services/api/errors';
import type { Session } from '@/services/api/types';
import { balanceOk, loginOk, sessionUnauthorized, transferOk } from '@/test/apiFixtures';
import { mockApiRoutes, reply } from '@/test/fetchMock';
import { settleRequests } from '@/test/homeHelpers';
import { prepareSessionTest, seedSession } from '@/test/sessionHelpers';
import { goToConfirm, TRANSFER_NOW } from '@/test/transferHelpers';
import {
  confirmSentDraft,
  DUPLICATE_NOTICE,
  logOut,
  openHome,
  pressButton,
  sendSentDraft,
  signIn,
} from '@/test/transferSessionHelpers';

jest.mock('expo-font', () => ({ useFonts: jest.fn(() => [true, null]) }));

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

const EXPIRED = ERROR_MESSAGES.unauthorized;
const EXPIRED_REPLY = reply(401, sessionUnauthorized);

const otherUser: Session = {
  token: 'otro-token-de-prueba',
  user: { id: 2, name: 'Bruna Prueba', email: 'bruna@ejemplo.com' },
};

beforeEach(() => {
  prepareSessionTest();
  seedSession(loginOk);
  jest.useFakeTimers().setSystemTime(TRANSFER_NOW);
});
afterEach(jest.restoreAllMocks);

// Envía el borrador de prueba con éxito y queda en el resultado: el intento ya está registrado.
async function sendSuccessfully() {
  await openHome(reply(200, transferOk));
  await sendSentDraft();
  expect(screen.getByRole('header', { name: 'Transferencia realizada' })).toBeOnTheScreen();
}

function expectNoAttemptData() {
  const { draft, lastAttempt, attempts } = useTransferStore.getState();
  expect({ draft, lastAttempt, attempts }).toEqual({ draft: null, lastAttempt: null, attempts: [] });
}

// Desde el resultado, el siguiente 401 llega en el lugar indicado.
const EXPIRY_PLACES: [string, () => Promise<void>][] = [
  [
    'formulario',
    async () => {
      await pressButton('Volver al inicio');
      await settleRequests();
      mockApiRoutes({ balance: EXPIRED_REPLY });
      await pressButton('Nueva transferencia');
    },
  ],
  [
    'confirmación',
    async () => {
      await pressButton('Volver al inicio');
      await settleRequests();
      mockApiRoutes({ balance: reply(200, balanceOk), transfer: EXPIRED_REPLY });
      await confirmSentDraft();
      await pressButton('Enviar otra igual');
    },
  ],
  [
    'Inicio',
    async () => {
      mockApiRoutes({ balance: EXPIRED_REPLY });
      await pressButton('Volver al inicio');
    },
  ],
];

describe('fin de la sesión con Salir', () => {
  it.each([
    ['mismo usuario', loginOk],
    ['otro usuario', otherUser],
  ])(
    'tras Salir y volver a entrar, con el mismo usuario o con otro, el formulario está vacío y no hay aviso (%s)',
    async (_who, session) => {
      await sendSuccessfully();
      await pressButton('Volver al inicio');
      await settleRequests();

      await logOut();
      await signIn(session);
      expectNoAttemptData();
      await pressButton('Nueva transferencia');
      await settleRequests();

      expect(screen.getByLabelText('Valor')).toHaveDisplayValue('');
      expect(screen.getByLabelText('Documento del destinatario')).toHaveDisplayValue('');
      await goToConfirm();
      expect(screen).toHavePathname('/nueva-transferencia/confirmar');
      expect(screen.queryByText(DUPLICATE_NOTICE)).toBeNull();
    },
  );
});

describe('fin de la sesión por un 401', () => {
  it.each(EXPIRY_PLACES)(
    'tras un 401 en el formulario, en la confirmación o en el Inicio y volver a entrar no hay aviso ni datos del intento (%s)',
    async (_place, expire) => {
      await sendSuccessfully();

      await expire();
      await settleRequests();
      expect(await screen.findByText(EXPIRED)).toBeOnTheScreen();
      expect(screen).toHavePathname('/login');

      await signIn();
      expectNoAttemptData();
      await confirmSentDraft();
      expect(screen).toHavePathname('/nueva-transferencia/confirmar');
      expect(screen.queryByText(DUPLICATE_NOTICE)).toBeNull();
    },
  );
});
