import { act, fireEvent, screen } from 'expo-router/testing-library';

import { focusedFieldLabels, spyOnFocusEvents, watchFocus } from '@/test/focus';
import { settleRequests } from '@/test/homeHelpers';
import {
  chooseDate,
  fillValidForm,
  goToConfirm,
  pasteInto,
  renderTransferFlow,
  transferRequests,
  typeAmount,
  typeDocument,
} from '@/test/transferHelpers';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

const FIELD_ERRORS = [
  'Escribe el valor.',
  'El valor debe ser mayor que 0.',
  'El valor supera tu saldo disponible.',
  'Escribe el documento del destinatario.',
  'El documento debe tener 11 dígitos (CPF) o 14 (CNPJ).',
  'La fecha no puede ser anterior a hoy.',
  'Elige una fecha dentro del próximo año.',
];

const SPOKEN_DATE_PREFIX = 'Fecha de la transferencia:';

afterEach(jest.restoreAllMocks);

async function pressContinue() {
  await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
}

async function openForm() {
  await renderTransferFlow();
  await settleRequests();
}

function expectNoFieldErrors() {
  for (const message of FIELD_ERRORS) expect(screen.queryByText(message)).not.toBeOnTheScreen();
}

describe('NewTransferScreen: antes de continuar', () => {
  it.each([
    { name: 'vacío', fill: async () => undefined },
    { name: 'a medias', fill: () => typeAmount('999999') },
    { name: 'válido', fill: fillValidForm },
  ])('Continuar está habilitado y no hay errores antes de pulsarlo: «$name»', async ({ fill }) => {
    await openForm();

    await fill();

    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled();
    expectNoFieldErrors();
  });
});

// Formularios con errores en distintos campos y lo que debe recibir el foco.
const ERROR_CASES = [
  {
    name: 'valor y documento',
    fill: async () => undefined,
    messages: [FIELD_ERRORS[0], FIELD_ERRORS[3]],
    focused: ['Valor'],
    dateFocused: false,
  },
  {
    name: 'documento y fecha',
    fill: async () => {
      await typeAmount('125000');
      await chooseDate({ year: 2026, month: 10, day: 30 });
    },
    messages: [FIELD_ERRORS[3], FIELD_ERRORS[5]],
    focused: ['Documento del destinatario'],
    dateFocused: false,
  },
  {
    name: 'solo fecha',
    fill: async () => {
      await fillValidForm();
      await chooseDate({ year: 2027, month: 11, day: 1 });
    },
    messages: [FIELD_ERRORS[6]],
    focused: [],
    dateFocused: true,
  },
];

describe('NewTransferScreen: errores al continuar', () => {
  it.each(ERROR_CASES)('muestra el error de cada campo, no navega y enfoca el primero: «$name»', async (row) => {
    watchFocus();
    await openForm();
    await row.fill();
    const focusEvents = spyOnFocusEvents();

    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));

    for (const message of row.messages) expect(screen.getByText(message)).toBeOnTheScreen();
    expect(screen).toHavePathname('/nueva-transferencia');
    expect(focusedFieldLabels()).toEqual(row.focused);
    const dateEvents = focusEvents().filter((label) => label?.startsWith(SPOKEN_DATE_PREFIX));
    expect(dateEvents).toHaveLength(row.dateFocused ? 1 : 0);
  });
});

// Cada fila: cómo dejar solo ese campo con error y dos ediciones: otra regla y luego válido.
const RECHECK_CASES = [
  {
    name: 'valor',
    prepare: () => typeDocument('12345678900'),
    edits: [() => typeAmount('0'), () => typeAmount('1')],
    messages: [FIELD_ERRORS[0], FIELD_ERRORS[1]],
  },
  {
    name: 'documento',
    prepare: () => typeAmount('125000'),
    edits: [() => typeDocument('1'), () => typeDocument('2345678900')],
    messages: [FIELD_ERRORS[3], FIELD_ERRORS[4]],
  },
  {
    name: 'fecha',
    prepare: async () => {
      await fillValidForm();
      await chooseDate({ year: 2026, month: 10, day: 30 });
    },
    edits: [() => chooseDate({ year: 2027, month: 11, day: 1 }), () => chooseDate({ year: 2026, month: 11, day: 15 })],
    messages: [FIELD_ERRORS[5], FIELD_ERRORS[6]],
  },
];

describe('NewTransferScreen: revalidación en vivo', () => {
  it.each(RECHECK_CASES)('un campo con error se revalida en cada cambio: «$name»', async ({ prepare, edits, messages }) => {
    await openForm();
    await prepare();
    await pressContinue();
    expect(screen.getByText(messages[0])).toBeOnTheScreen();

    await edits[0]();
    expect(screen.queryByText(messages[0])).not.toBeOnTheScreen();
    expect(screen.getByText(messages[1])).toBeOnTheScreen();

    await edits[1]();
    expectNoFieldErrors();
  });

  it('un campo sin error no muestra mensajes mientras se edita', async () => {
    await openForm();
    await typeDocument('12345678900');
    await pressContinue();
    expect(screen.getByText(FIELD_ERRORS[0])).toBeOnTheScreen();

    await pasteInto('Documento del destinatario', '123');
    await chooseDate({ year: 2026, month: 10, day: 30 });

    expect(screen.getByText(FIELD_ERRORS[0])).toBeOnTheScreen();
    for (const message of FIELD_ERRORS.slice(3)) expect(screen.queryByText(message)).not.toBeOnTheScreen();
  });
});

describe('NewTransferScreen: continuar con todo válido', () => {
  it('con los tres campos válidos abre la confirmación sin enviar ninguna transferencia', async () => {
    await openForm();

    await goToConfirm();
    await settleRequests();

    expect(screen).toHavePathname('/nueva-transferencia/confirmar');
    expect(screen.getByRole('header', { name: 'Confirmar transferencia' })).toBeOnTheScreen();
    expect(screen.getByText('CPF 123.456.789-00')).toBeOnTheScreen();
    expect(transferRequests()).toHaveLength(0);
  });

  it('dos Continuar seguidos abren una sola confirmación y un Volver regresa al formulario', async () => {
    await openForm();
    await fillValidForm();

    // Las dos pulsaciones llegan en el mismo tick, antes de que cambie la pantalla.
    const button = screen.getByRole('button', { name: 'Continuar' });
    await act(async () => {
      await Promise.all([fireEvent.press(button), fireEvent.press(button)]);
    });
    expect(screen).toHavePathname('/nueva-transferencia/confirmar');

    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));

    expect(screen).toHavePathname('/nueva-transferencia');
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeOnTheScreen();
  });
});

describe('NewTransferScreen: teclas del teclado', () => {
  it('siguiente en el valor pasa al documento', async () => {
    watchFocus();
    await openForm();
    const amount = screen.getByLabelText('Valor');
    expect(amount.props).toMatchObject({ returnKeyType: 'next', submitBehavior: 'submit' });

    await fireEvent(amount, 'submitEditing');

    expect(focusedFieldLabels()).toEqual(['Documento del destinatario']);
  });

  it('hecho en el documento cierra el teclado sin validar ni navegar', async () => {
    await openForm();
    await typeDocument('123');
    const document = screen.getByLabelText('Documento del destinatario');
    expect(document.props).toMatchObject({ returnKeyType: 'done', submitBehavior: 'blurAndSubmit' });
    expect(document.props.onSubmitEditing).toBeUndefined();

    await fireEvent(document, 'submitEditing');

    expectNoFieldErrors();
    expect(screen).toHavePathname('/nueva-transferencia');
  });
});
