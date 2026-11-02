import { fireEvent, screen } from 'expo-router/testing-library';

import { treeIndex } from '@/test/a11yTree';
import { balanceBody } from '@/test/apiFixtures';
import { reply } from '@/test/fetchMock';
import { settleRequests } from '@/test/homeHelpers';
import { chooseDate, pasteInto, renderTransferFlow, typeAmount, typeDocument } from '@/test/transferHelpers';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

const AMOUNT = 'Valor';
const AMOUNT_ERRORS = [
  'Escribe el valor.',
  'El valor debe ser mayor que 0.',
  'El valor supera tu saldo disponible.',
];

async function pressContinue() {
  await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
}

function expectErrorUnderAmount(message: string) {
  const error = screen.getByText(message);
  expect(treeIndex(error)).toBeGreaterThan(treeIndex(screen.getByLabelText(AMOUNT)));
  expect(treeIndex(error)).toBeLessThan(treeIndex(screen.getByLabelText('Documento del destinatario')));
}

function expectNoAmountError() {
  for (const message of AMOUNT_ERRORS) expect(screen.queryByText(message)).not.toBeOnTheScreen();
}

async function openForm(balance = 1800) {
  await renderTransferFlow({ balance: reply(200, balanceBody(balance, 'USD')) });
  await settleRequests();
}

describe('NewTransferScreen: escritura del valor', () => {
  it('escribir 1-2-5-0-0-0 muestra 1.250,00 con teclado numérico', async () => {
    await openForm();

    await typeAmount('125000');

    const amount = screen.getByLabelText(AMOUNT);
    expect(amount).toHaveDisplayValue('1.250,00');
    expect(amount.props.keyboardType).toBe('number-pad');
  });

  it('pegar 1.250,00 en el campo vacío lo muestra igual', async () => {
    await openForm();

    await pasteInto(AMOUNT, '1.250,00');

    expect(screen.getByLabelText(AMOUNT)).toHaveDisplayValue('1.250,00');
  });

  it('con doce dígitos un dígito más no cambia el campo', async () => {
    await openForm();
    await typeAmount('999999999999');
    expect(screen.getByLabelText(AMOUNT)).toHaveDisplayValue('9.999.999.999,99');

    await typeAmount('9');

    expect(screen.getByLabelText(AMOUNT)).toHaveDisplayValue('9.999.999.999,99');
  });
});

describe('NewTransferScreen: validación del valor', () => {
  it.each([
    { name: 'vacío', digits: '', shown: '', message: 'Escribe el valor.' },
    { name: 'cero', digits: '0', shown: '0,00', message: 'El valor debe ser mayor que 0.' },
    { name: 'mínimo', digits: '1', shown: '0,01', message: null },
    { name: 'normal', digits: '125000', shown: '1.250,00', message: null },
    { name: 'igual al saldo', digits: '180000', shown: '1.800,00', message: null },
    { name: 'saldo + 0,01', digits: '180001', shown: '1.800,01', message: 'El valor supera tu saldo disponible.' },
    { name: 'muy superior', digits: '999999999999', shown: '9.999.999.999,99', message: 'El valor supera tu saldo disponible.' },
  ])('al continuar muestra bajo el valor el resultado de cada partición: «$name»', async ({ digits, shown, message }) => {
    await openForm();
    await typeAmount(digits);
    expect(screen.getByLabelText(AMOUNT)).toHaveDisplayValue(shown);

    await pressContinue();

    if (message === null) expectNoAmountError();
    else expectErrorUnderAmount(message);
  });
});

describe('NewTransferScreen: tope del saldo', () => {
  it('con saldo 1500,505 acepta 1.500,50 y rechaza 1.500,51', async () => {
    await openForm(1500.505);

    await typeAmount('150050');
    await pressContinue();
    expectNoAmountError();

    await pasteInto(AMOUNT, '1.500,51');
    await pressContinue();
    expectErrorUnderAmount('El valor supera tu saldo disponible.');
  });

  it('una transferencia programada por encima del saldo muestra el error del tope', async () => {
    await openForm();
    await typeAmount('180001');
    await typeDocument('12345678900');
    await chooseDate({ year: 2026, month: 11, day: 15 });
    expect(screen.getByText('15/11/2026')).toBeOnTheScreen();

    await pressContinue();

    expectErrorUnderAmount('El valor supera tu saldo disponible.');
  });
});
