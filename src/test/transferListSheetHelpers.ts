import { act, fireEvent, screen, within } from 'expo-router/testing-library';

import type { CalendarDate } from '@/utils/date';

import { pickDate } from './datePickerMock';
import type { Reply } from './fetchMock';
import { applySheet, openSheet, renderTransferList, showSheet, typeBound, typeSearch } from './transferListHelpers';

export type BoundLabel = 'Desde' | 'Hasta';
export const BOUND_LABELS: BoundLabel[] = ['Desde', 'Hasta'];

export const AMOUNT_SHEET_TITLE = 'Filtrar por valor';

// Encabezado de la hoja de valor, si está abierta.
export const amountSheetTitle = () => screen.queryByRole('header', { name: AMOUNT_SHEET_TITLE });

export const boundField = (label: BoundLabel) => screen.getByLabelText(label);

// Símbolo que se ve delante del importe, dentro de la caja del campo.
export function prefixOf(label: BoundLabel) {
  const box = boundField(label).parent;
  const texts = box ? within(box).queryAllByText(/./, { includeHiddenElements: true }) : [];
  return texts.map((node) => node.props.children);
}

// Botón ✕ que vacía el campo, si se ve.
export const clearBoundButton = (label: BoundLabel) =>
  screen.queryByRole('button', { name: `Borrar valor ${label.toLowerCase()}` });

// Entra al listado y espera a que se vea el contador con las transferencias recibidas.
export async function renderLoadedList(list?: Reply, total = 3) {
  await renderTransferList({ list });
  const noun = total === 1 ? 'transferencia' : 'transferencias';
  expect(await screen.findByText(`${total} ${noun}`)).toBeOnTheScreen();
}

// Con «mes» y 2.000,00–4.000,00 aplicados solo se ve Messi.
export async function renderFilteredList() {
  await renderLoadedList();
  await typeSearch('mes');
  await applyAmountRange('2.000,00', '4.000,00');
  expect(screen.getByText('1 de 3 transferencias')).toBeOnTheScreen();
}

// Escribe tecla a tecla los dígitos del importe que se quiere ver («1.000,00» → 1, 0, 0, 0, 0, 0).
export async function typeShownAmount(label: BoundLabel, shown: string) {
  await typeBound(label, shown.replace(/\D/g, ''));
}

// Abre la hoja de valor y escribe los dos extremos; un texto vacío deja el campo sin tocar.
export async function fillAmountSheet(from: string, to: string) {
  await openSheet('Valor');
  await showSheet();
  await typeShownAmount('Desde', from);
  await typeShownAmount('Hasta', to);
}

// Abre la hoja, escribe los extremos y pulsa «Aplicar».
export async function applyAmountRange(from: string, to: string) {
  await fillAmountSheet(from, to);
  await applySheet();
}

// Pulsa el ✕ de un campo y deja pasar el fotograma en que llega el foco del lector.
export async function pressClearBound(label: BoundLabel) {
  const button = clearBoundButton(label);
  if (!button) throw new Error(`No hay botón para borrar ${label}`);
  await fireEvent.press(button);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(16);
  });
}

export const DATE_SHEET_TITLE = 'Filtrar por fecha';

// Encabezado de la hoja de fecha, si está abierta.
export const dateSheetTitle = () => screen.queryByRole('header', { name: DATE_SHEET_TITLE });

// Campo de fecha de la hoja: un botón cuya etiqueta empieza por «Fecha desde:» o «Fecha hasta:».
export const dateBoundField = (label: BoundLabel) =>
  screen.getByRole('button', { name: new RegExp(`^Fecha ${label.toLowerCase()}: `) });

// Pulsa un campo de fecha de la hoja para abrir su selector.
export async function pressDateBound(label: BoundLabel) {
  await fireEvent.press(dateBoundField(label));
}

// Abre el selector del campo, acepta ese día y deja pasar el fotograma en que vuelve el foco.
export async function chooseBound(label: BoundLabel, date: CalendarDate) {
  await pressDateBound(label);
  await pickDate(date);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(16);
  });
}

// Abre la hoja de fecha, elige los extremos que no son null y pulsa «Aplicar».
export async function applyDateRange(from: CalendarDate | null, to: CalendarDate | null) {
  await openSheet('Fecha');
  await showSheet();
  if (from) await chooseBound('Desde', from);
  if (to) await chooseBound('Hasta', to);
  await applySheet();
}

// Botón ✕ que deja un campo de fecha en «Sin límite», si se ve.
export const clearDateButton = (label: BoundLabel) =>
  screen.queryByRole('button', { name: `Borrar fecha ${label.toLowerCase()}` });

// Pulsa el ✕ de un campo de fecha y deja pasar el fotograma en que llega el foco del lector.
export async function pressClearDate(label: BoundLabel) {
  const button = clearDateButton(label);
  if (!button) throw new Error(`No hay botón para borrar la fecha ${label}`);
  await fireEvent.press(button);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(16);
  });
}
