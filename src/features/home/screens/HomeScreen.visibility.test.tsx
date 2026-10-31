import { router } from 'expo-router';
import { act, fireEvent, screen } from 'expo-router/testing-library';

import { ERROR_MESSAGES } from '@/services/api/errors';
import { exposedStrings } from '@/test/a11yTree';
import { balanceBody } from '@/test/apiFixtures';
import { mockApiRoutes, reply, type Reply } from '@/test/fetchMock';
import { renderHome, settleRequests, spyOnAnnouncements } from '@/test/homeHelpers';

const NBSP = ' ';
const AMOUNT = `US$${NBSP}1.800,00`;
const MASKED = `US$${NBSP}••••••`;

afterEach(jest.restoreAllMocks);

// Respuesta del refresco, saldo oculto esperado, cifra esperada al mostrarlo y aviso, si lo hay.
type RefreshCase = { name: string; balance: Reply; masked: string; shown: string; notice: string | null };

const refreshCases: RefreshCase[] = [
  {
    name: 'éxito con BRL',
    balance: reply(200, balanceBody(2500, 'BRL')),
    masked: `R$${NBSP}••••••`,
    shown: `R$${NBSP}2.500,00`,
    notice: null,
  },
  { name: 'sin red', balance: 'networkError', masked: MASKED, shown: AMOUNT, notice: ERROR_MESSAGES.network },
];

// Carga el Inicio en la plataforma dada y empieza a contar anuncios a partir de aquí.
async function renderLoadedHome(os: 'ios' | 'android') {
  const announce = spyOnAnnouncements(os);
  await renderHome();
  await settleRequests();
  announce.mockClear();
  return { announce, eye: screen.getByRole('button', { name: 'Ocultar saldo' }) };
}

describe('HomeScreen: visibilidad del saldo', () => {
  it('al entrar el saldo está visible y el ojo se llama Ocultar saldo', async () => {
    await renderHome();
    await settleRequests();

    expect(screen.getByText(AMOUNT)).toBeOnTheScreen();
    expect(screen.getByLabelText('Saldo disponible: 1.800,00 dólares')).toBeOnTheScreen();
    expect(screen.queryByText(MASKED)).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ocultar saldo' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Mostrar saldo' })).not.toBeOnTheScreen();
  });
});

describe('HomeScreen: el ojo alterna la visibilidad del saldo', () => {
  it.each(['ios', 'android'] as const)(
    'al pulsar el ojo oculta la cifra, renombra el mismo botón a Mostrar saldo y anuncia Saldo oculto (%s)',
    async (os) => {
      const { announce, eye } = await renderLoadedHome(os);

      await fireEvent.press(eye);

      expect(screen.getByText(MASKED)).toBeOnTheScreen();
      expect(screen.queryByText(AMOUNT)).not.toBeOnTheScreen();
      expect(screen.getByLabelText('Saldo disponible: oculto')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Mostrar saldo' })).toBe(eye);
      expect(announce).toHaveBeenCalledTimes(1);
      expect(announce).toHaveBeenCalledWith('Saldo oculto');
    },
  );

  it.each(['ios', 'android'] as const)(
    'al volver a pulsar el ojo vuelve la cifra, el botón se llama Ocultar saldo y anuncia Saldo visible (%s)',
    async (os) => {
      const { announce, eye } = await renderLoadedHome(os);

      await fireEvent.press(eye);
      await fireEvent.press(eye);

      expect(screen.getByText(AMOUNT)).toBeOnTheScreen();
      expect(screen.queryByText(MASKED)).not.toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Ocultar saldo' })).toBe(eye);
      expect(announce.mock.calls).toEqual([['Saldo oculto'], ['Saldo visible']]);
    },
  );
});

describe('HomeScreen: las recargas no tocan el ojo', () => {
  it.each(refreshCases)(
    'con el saldo oculto un refresco correcto o fallido no cambia el ojo y usa el símbolo de la última respuesta correcta ($name)',
    async ({ balance, masked, shown, notice }) => {
      const { eye } = await renderLoadedHome('ios');
      await fireEvent.press(eye);

      await act(async () => router.push('/transferencias'));
      mockApiRoutes({ balance });
      await act(async () => router.back());
      await settleRequests();

      if (notice) expect(screen.getByText(notice)).toBeOnTheScreen();
      expect(screen.getByText(masked)).toBeOnTheScreen();
      expect(screen.getAllByText(/••••••/)).toHaveLength(1);
      expect(screen.queryByText(/\d/)).not.toBeOnTheScreen();
      expect(screen.getByLabelText('Saldo disponible: oculto')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Mostrar saldo' })).toBe(eye);
      expect(screen.queryByRole('button', { name: 'Ocultar saldo' })).not.toBeOnTheScreen();

      await fireEvent.press(eye);

      expect(screen.getByText(shown)).toBeOnTheScreen();
      expect(screen.queryByText(masked)).not.toBeOnTheScreen();
    },
  );
});

describe('HomeScreen: el saldo oculto no delata el importe', () => {
  it.each([0, 1800, 1234567.89])(
    'oculto muestra siempre seis puntos y el importe no aparece en textos, etiquetas, valores, pistas ni anuncios (%s)',
    async (amount) => {
      const announce = spyOnAnnouncements('ios');
      await renderHome({ balance: reply(200, balanceBody(amount, 'USD')) });
      await settleRequests();
      announce.mockClear();
      // Con la cifra visible sí hay dígitos expuestos: la comprobación de después no pasa por vacía.
      expect(exposedStrings().some((text) => /\d/.test(text))).toBe(true);

      await fireEvent.press(screen.getByRole('button', { name: 'Ocultar saldo' }));

      expect(screen.getByText(MASKED)).toBeOnTheScreen();
      expect(screen.getAllByText(/•/)).toHaveLength(1);
      expect(exposedStrings()).toContain('Saldo disponible: oculto');
      // El Inicio no muestra otros números: con el saldo oculto no debe quedar ningún dígito expuesto.
      expect(exposedStrings().filter((text) => /\d/.test(text))).toEqual([]);
      expect(announce.mock.calls).toEqual([['Saldo oculto']]);
    },
  );
});
