import { screen } from 'expo-router/testing-library';

import { ERROR_MESSAGES } from '@/services/api/errors';

import { readingOrder } from './a11yTree';
import { transferListEmpty } from './apiFixtures';
import { reply } from './fetchMock';
import { renderTransferList, settleRequests } from './transferListHelpers';
import { answerListWith, settleFailure, visitNewTransferAndBack } from './transferListRefreshHelpers';

export const NETWORK_MESSAGE = ERROR_MESSAGES.network;
export const RANGE_ERROR = '«Desde» no puede ser mayor que «Hasta».';

// Un estado de la pantalla y cómo llegar a él.
export type Scenario = { state: string; arrange: () => Promise<void> };

// Entra al listado con la primera carga fallida sin red.
export async function renderFirstLoadError() {
  await renderTransferList({ list: 'networkError' });
  await settleRequests();
  expect(screen.getByText(NETWORK_MESSAGE)).toBeOnTheScreen();
}

// Entra al listado cuando el servidor no tiene ninguna transferencia.
export async function renderNoTransfers() {
  await renderTransferList({ list: reply(200, transferListEmpty.wrapped) });
  await settleRequests();
}

// Con la lista ya cargada, la recarga al volver de otra pantalla falla sin red.
export async function failListRefresh() {
  answerListWith('networkError');
  await visitNewTransferAndBack();
  await settleFailure('networkError');
  expect(screen.getByText(NETWORK_MESSAGE)).toBeOnTheScreen();
}

// Lo que lee el lector en el listado, desde «Volver»: el Inicio sigue montado debajo en la pila.
export function listReadingOrder() {
  const order = readingOrder();
  return order.slice(order.indexOf('Volver'));
}

type Node = ReturnType<typeof screen.getByText>;

// Trazos de los iconos dibujados dentro del nodo.
export function iconPathsIn(node: Node) {
  return node.queryAll((child) => typeof child.props.d === 'string');
}

// Contenedor inmediato de un texto visible: la fila o el bloque donde va su icono.
export function blockOf(text: string) {
  const parent = screen.getByText(text).parent;
  if (!parent) throw new Error(`El texto «${text}» no tiene contenedor`);
  return parent;
}
