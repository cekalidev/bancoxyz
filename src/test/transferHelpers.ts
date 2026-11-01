import { act } from '@testing-library/react-native';
import { router } from 'expo-router';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { connectApiToSession } from '@/features/auth';
import { useSessionStore } from '@/features/auth/sessionStore';
import { HomeScreen } from '@/features/home';
import { AppStack } from '@/features/shell/AppStack';
import { TransferListScreen } from '@/features/transfer-list';
import {
  ConfirmTransferScreen,
  connectTransfersToSession,
  NewTransferScreen,
  TransferResultScreen,
} from '@/features/transfers';
import { finishAttempt, resetTransfers, setDraft } from '@/features/transfers/transferActions';
import type { TransferAttempt, TransferDraft } from '@/features/transfers/types';
import { API_URLS } from '@/services/api/endpoints';
import type { Session } from '@/services/api/types';

import type { CalendarDate } from '@/utils/date';

import { balanceOk, loginOk } from './apiFixtures';
import { pickDate } from './datePickerMock';
import { mockApiRoutes, reply, type Reply } from './fetchMock';
import { balanceRequests } from './homeHelpers';
import { HomeStub } from './HomeStub';
import { resetSessionStore } from './sessionHelpers';

type TransferFlowOptions = { balance?: Reply; transfer?: Reply; now?: Date; link?: string };

export const transferSession: Session = loginOk;

// 31/10/2026 a las 10:00 en la hora local de los tests.
export const TRANSFER_NOW = new Date(2026, 9, 31, 10, 0);

let homeBalanceCalls = 0;

// Peticiones de saldo hechas desde que se abrió el formulario (sin contar las del Inicio).
export function formBalanceRequests() {
  return balanceRequests().slice(homeBalanceCalls);
}

// Monta el Inicio y el formulario con las cabeceras reales, una sesión activa, la red simulada
// y el reloj fijo, y entra al formulario pulsando «Nueva transferencia». Con `link` abre esa
// dirección directamente, como un enlace externo.
export async function renderTransferFlow({ balance = reply(200, balanceOk), transfer, now, link }: TransferFlowOptions = {}) {
  resetSessionStore();
  resetTransfers();
  useSessionStore.setState({ session: transferSession });
  connectApiToSession();
  connectTransfersToSession();
  mockApiRoutes(transfer ? { balance, transfer } : { balance });
  jest.useFakeTimers().setSystemTime(now ?? TRANSFER_NOW);
  const result = await renderRouter(
    {
      _layout: AppStack,
      index: HomeScreen,
      login: HomeStub,
      'nueva-transferencia/index': NewTransferScreen,
      'nueva-transferencia/confirmar': ConfirmTransferScreen,
      'nueva-transferencia/resultado': TransferResultScreen,
      transferencias: TransferListScreen,
    },
    { initialUrl: link ?? '/' },
  );
  homeBalanceCalls = balanceRequests().length;
  if (link !== undefined) return result;
  await fireEvent.press(await screen.findByRole('button', { name: 'Nueva transferencia' }));
  return result;
}

function typeInto(label: string) {
  return async (text: string) => {
    for (const char of text) {
      const input = screen.getByLabelText(label);
      await fireEvent.changeText(input, `${String(input.props.value ?? '')}${char}`);
    }
  };
}

// Escribe tecla a tecla: cada cambio parte de lo que el campo muestra en ese momento.
export const typeAmount = typeInto('Valor');
export const typeDocument = typeInto('Documento del destinatario');

// Pega el texto entero de una vez, como el portapapeles.
export async function pasteInto(label: string, text: string) {
  await fireEvent.changeText(screen.getByLabelText(label), text);
}

// Valor 1.250,00, CPF válido y la fecha de hoy que el formulario trae de inicio.
export async function fillValidForm() {
  await typeAmount('125000');
  await typeDocument('12345678900');
}

// Rellena el formulario con datos válidos y pulsa «Continuar».
export async function goToConfirm() {
  await fillValidForm();
  await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
}

export async function pressDateField() {
  await fireEvent.press(screen.getByRole('button', { name: /^Fecha de la transferencia/ }));
}

// Abre el selector simulado y acepta ese día.
export async function chooseDate(date: CalendarDate) {
  await pressDateField();
  await pickDate(date);
}

// Deja pasar los fotogramas con los que el selector termina de cerrarse y el foco vuelve al campo.
export function letPickerClose() {
  return act(() => jest.advanceTimersByTimeAsync(100));
}

// Peticiones de transferencia hechas en el test.
export function transferRequests() {
  return jest.mocked(global.fetch).mock.calls.filter(([input]) => String(input) === API_URLS.transfer);
}

// Guarda el borrador y abre la confirmación encima del formulario, sin pasar por «Continuar».
export async function openConfirmation(draft: TransferDraft) {
  setDraft(draft);
  await act(() => router.push('/nueva-transferencia/confirmar'));
}

// Guarda el intento como el último terminado y abre el resultado, sin pasar por el envío.
export async function openResult(attempt: TransferAttempt) {
  finishAttempt(attempt);
  await act(() => router.push('/nueva-transferencia/resultado'));
}

// Cuerpo JSON de la última petición de transferencia.
export function sentTransferBody(): unknown {
  const [, init] = transferRequests().at(-1) ?? [];
  return typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
}
