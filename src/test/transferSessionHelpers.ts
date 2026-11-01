import { act, fireEvent, screen } from 'expo-router/testing-library';
import { Alert, type AlertButton } from 'react-native';

import type { TransferDraft } from '@/features/transfers/types';
import type { Session } from '@/services/api/types';

import { balanceOk, loginOk, transferOk } from './apiFixtures';
import { mockApiRoutes, reply, type Reply } from './fetchMock';
import { settleRequests } from './homeHelpers';
import { renderApp } from './sessionHelpers';
import { goToConfirm } from './transferHelpers';

// El borrador que deja `goToConfirm`: 1.250,00 USD al CPF de prueba con la fecha de hoy.
export const SENT_DRAFT: TransferDraft = {
  cents: 125000,
  currency: 'USD',
  document: '12345678900',
  date: { year: 2026, month: 10, day: 31 },
};

export const DUPLICATE_NOTICE = /^Ya enviaste una transferencia igual/;

export const pressButton = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

// Espera al saludo del usuario y a que terminen las peticiones del Inicio.
export async function waitForHome(session: Session = loginOk) {
  expect(await screen.findByRole('header', { name: `Hola, ${session.user.name}` })).toBeOnTheScreen();
  await settleRequests();
}

// Abre la app con la sesión ya guardada y la transferencia respondiendo como se indique.
export async function openHome(transfer: Reply) {
  mockApiRoutes({ balance: reply(200, balanceOk), transfer });
  await renderApp('/');
  await waitForHome();
}

// Entra desde el login con esa sesión; después el saldo y la transferencia responden con éxito.
export async function signIn(session: Session = loginOk) {
  mockApiRoutes({ login: reply(200, session), balance: reply(200, balanceOk), transfer: reply(200, transferOk) });
  await fireEvent.changeText(await screen.findByLabelText('Correo electrónico'), session.user.email);
  await fireEvent.changeText(screen.getByLabelText('Contraseña'), 'clave-secreta-42');
  await pressButton('Entrar');
  await waitForHome(session);
}

// Abre el formulario desde el Inicio, lo rellena con el borrador de prueba y pulsa «Continuar».
export async function confirmSentDraft() {
  await pressButton('Nueva transferencia');
  await settleRequests();
  await goToConfirm();
}

// Envía el borrador de prueba desde el Inicio y espera la respuesta.
export async function sendSentDraft() {
  await confirmSentDraft();
  await pressButton('Confirmar transferencia');
  await settleRequests();
}

// Pulsa «Cerrar sesión» y elige «Salir» en el diálogo.
export async function logOut() {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  await pressButton('Cerrar sesión');
  const buttons: AlertButton[] = alert.mock.calls.at(-1)?.[2] ?? [];
  const exit = buttons.find((button) => button.text === 'Salir');
  if (!exit) throw new Error('El diálogo no tiene el botón Salir');
  await act(async () => exit.onPress?.());
  await settleRequests();
}
