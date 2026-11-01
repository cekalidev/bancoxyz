import { fireEvent, screen } from 'expo-router/testing-library';

import { settleRequests } from '@/test/homeHelpers';
import { pasteInto, renderTransferFlow, typeAmount, typeDocument } from '@/test/transferHelpers';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

const DOCUMENT = 'Documento del destinatario';
const EMPTY = 'Escribe el documento del destinatario.';
const LENGTH = 'El documento debe tener 11 dígitos (CPF) o 14 (CNPJ).';

// Posición del nodo en el recorrido del árbol, que es el orden visual.
function treeIndex(node: ReturnType<typeof screen.getByText>) {
  return screen.container.queryAll(() => true).indexOf(node);
}

function expectErrorUnderDocument(message: string) {
  const error = screen.getByText(message);
  expect(treeIndex(error)).toBeGreaterThan(treeIndex(screen.getByLabelText(DOCUMENT)));
  expect(treeIndex(error)).toBeLessThan(treeIndex(screen.getByText('Hoy, 31/10/2026')));
}

async function openForm() {
  await renderTransferFlow();
  await settleRequests();
}

describe('NewTransferScreen: escritura del documento', () => {
  it.each([
    ['123', '123'],
    ['1234', '123.4'],
    ['123456789', '123.456.789'],
    ['12345678900', '123.456.789-00'],
    ['123456789012', '12.345.678/9012'],
    ['12345678000190', '12.345.678/0001-90'],
  ])('el documento usa teclado numérico y enmascara lo que escribo: «%s» → «%s»', async (digits, shown) => {
    await openForm();

    await typeDocument(digits);

    const document = screen.getByLabelText(DOCUMENT);
    expect(document).toHaveDisplayValue(shown);
    expect(document.props.keyboardType).toBe('number-pad');
  });
});

describe('NewTransferScreen: pegado y tope del documento', () => {
  it.each([
    ['123.456.789-00', '123.456.789-00'],
    ['12.345.678/0001-90', '12.345.678/0001-90'],
  ])('pegar un CPF o un CNPJ con separadores lo muestra con su máscara: «%s»', async (pasted, shown) => {
    await openForm();

    await pasteInto(DOCUMENT, pasted);

    expect(screen.getByLabelText(DOCUMENT)).toHaveDisplayValue(shown);
  });

  it('con catorce dígitos uno más no cambia el campo y un pegado largo se corta', async () => {
    await openForm();
    await typeDocument('12345678000190');

    await typeDocument('1');
    expect(screen.getByLabelText(DOCUMENT)).toHaveDisplayValue('12.345.678/0001-90');

    await pasteInto(DOCUMENT, '');
    await pasteInto(DOCUMENT, '12.345.678/0001-9099');
    expect(screen.getByLabelText(DOCUMENT)).toHaveDisplayValue('12.345.678/0001-90');
  });
});

describe('NewTransferScreen: validación del documento', () => {
  it.each([
    { name: 'vacío', digits: '', message: EMPTY },
    { name: 'corto (10)', digits: '1234567890', message: LENGTH },
    { name: 'CPF de la API', digits: '12345678900', message: null },
    { name: 'CPF del listado real', digits: '12019910177', message: null },
    { name: 'intermedio (12)', digits: '123456789012', message: LENGTH },
    { name: 'intermedio (13)', digits: '1234567890123', message: LENGTH },
    { name: 'CNPJ', digits: '12345678000190', message: null },
  ])('al continuar muestra el resultado de cada documento: «$name»', async ({ digits, message }) => {
    await openForm();
    await typeAmount('125000');
    await typeDocument(digits);

    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));

    if (message !== null) expectErrorUnderDocument(message);
    else for (const text of [EMPTY, LENGTH]) expect(screen.queryByText(text)).not.toBeOnTheScreen();
    expect(screen.queryByText('Escribe el valor.')).not.toBeOnTheScreen();
  });
});
