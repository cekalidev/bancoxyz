import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { connectApiToSession } from '@/features/auth';
import { useSessionStore } from '@/features/auth/sessionStore';
import { HomeScreen } from '@/features/home';
import { AppStack } from '@/features/shell/AppStack';
import { TransferListScreen } from '@/features/transfer-list';
import { ConfirmTransferScreen, NewTransferScreen, TransferResultScreen } from '@/features/transfers';
import { resetTransfers } from '@/features/transfers/transferActions';
import { API_URLS } from '@/services/api/endpoints';
import type { Session } from '@/services/api/types';

import { balanceOk, loginOk, transferListWrapped, transferOk } from './apiFixtures';
import { mockApiRoutes, reply, type Reply } from './fetchMock';
import { HomeStub } from './HomeStub';
import { resetSessionStore } from './sessionHelpers';

type TransferListOptions = { list?: Reply; now?: Date; session?: Session };

export const listSession: Session = { ...loginOk, token: 'token-de-prueba-123' };

// 31/10/2026 a las 10:00 en la hora local de los tests.
export const LIST_NOW = new Date(2026, 9, 31, 10, 0);

// Monta el Inicio y el listado con las cabeceras reales, una sesión activa, la red simulada
// y el reloj fijo, y entra al listado pulsando «Ver transferencias».
export async function renderTransferList({ list, now, session }: TransferListOptions = {}) {
  resetSessionStore();
  resetTransfers();
  useSessionStore.setState({ session: session ?? listSession });
  connectApiToSession();
  mockApiRoutes({
    balance: reply(200, balanceOk),
    transferList: list ?? reply(200, transferListWrapped),
    transfer: reply(200, transferOk),
  });
  jest.useFakeTimers().setSystemTime(now ?? LIST_NOW);
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
    { initialUrl: '/' },
  );
  await fireEvent.press(await screen.findByRole('button', { name: 'Ver transferencias' }));
  return result;
}

// Peticiones del listado hechas en el test.
export function listRequests() {
  return jest.mocked(global.fetch).mock.calls.filter(([input]) => String(input) === API_URLS.transferList);
}

const ROW_LABEL = /^Transferencia a (.+?), /;

// Nombres de los destinatarios en el orden en que se ven las filas.
export function rowNames() {
  return screen
    .queryAllByLabelText(ROW_LABEL)
    .map((row) => ROW_LABEL.exec(String(row.props.accessibilityLabel))?.[1]);
}

// La fila del destinatario: un único elemento con su etiqueta accesible.
export function rowOf(name: string) {
  return screen.getByLabelText(new RegExp(`^Transferencia a ${name}, `));
}

// Deja que terminen las respuestas simuladas y las actualizaciones que provocan.
export async function settleRequests() {
  await act(async () => {
    await Promise.allSettled(jest.mocked(global.fetch).mock.results.map((result) => result.value));
    await jest.advanceTimersByTimeAsync(0);
  });
}

// Escribe el texto en la búsqueda, sustituyendo lo que hubiera.
export async function typeSearch(text: string) {
  await fireEvent.changeText(screen.getByLabelText('Nombre del destinatario'), text);
}

type SheetChip = 'Valor' | 'Fecha';
type FocusTarget = { props: { accessibilityLabel?: string; children?: unknown } };

function isFocusTarget(node: unknown): node is FocusTarget {
  return typeof node === 'object' && node !== null && 'props' in node;
}

// Nombre del nodo al que se pidió llevar el foco: su etiqueta o, en un texto, el propio texto.
function focusTargetName(node: unknown) {
  if (!isFocusTarget(node)) return undefined;
  const { accessibilityLabel, children } = node.props;
  return accessibilityLabel ?? (typeof children === 'string' ? children : undefined);
}

// Nombres de los nodos que recibieron el foco del lector, en orden (también títulos sin etiqueta).
export function spyOnReaderFocus() {
  const sendEvent = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockClear();
  return () => sendEvent.mock.calls.filter(([, type]) => type === 'focus').map(([node]) => focusTargetName(node));
}

// El Modal de la hoja abierta, si lo hay.
export function sheetModal() {
  return screen.container.queryAll((node) => node.type === 'Modal')[0];
}

// Pulsa el chip y espera a que la hoja conozca la preferencia de movimiento y se muestre.
export async function openSheet(chip: SheetChip) {
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^Filtro de ${chip.toLowerCase()}:`) }));
  await act(async () => {
    await jest.advanceTimersByTimeAsync(0);
  });
}

// El sistema avisa de que la hoja ya se ve; el foco del lector llega en el fotograma siguiente.
export async function showSheet() {
  await fireEvent(sheetModal(), 'show');
  await act(async () => {
    await jest.advanceTimersByTimeAsync(16);
  });
}

// Escribe en un campo de la hoja de valor tecla a tecla: cada cambio parte de lo que el campo muestra.
export async function typeBound(label: 'Desde' | 'Hasta', keys: string) {
  for (const key of keys) {
    const input = screen.getByLabelText(label);
    await fireEvent.changeText(input, `${String(input.props.value ?? '')}${key}`);
  }
}

// Pulsa «Aplicar» en la hoja abierta y deja pasar el fotograma en que el foco vuelve al chip.
export async function applySheet() {
  await fireEvent.press(screen.getByRole('button', { name: 'Aplicar' }));
  await act(async () => {
    await jest.advanceTimersByTimeAsync(16);
  });
}
