import { fireEvent, screen } from 'expo-router/testing-library';
import { Platform } from 'react-native';

import { accessibleOrder, expectInTreeOrder } from '@/test/a11yTree';
import { politeRegionWith, settleRequests, spyOnAnnouncements } from '@/test/homeHelpers';
import { alertIconPaths, pathsOf } from '@/test/iconPaths';
import { formScrollView, openKeyboard } from '@/test/keyboard';
import { chooseDate, renderTransferFlow, typeAmount } from '@/test/transferHelpers';
import { layout } from '@/theme';
import { currencySymbol } from '@/utils/money';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

const AMOUNT_HINT = 'Disponible: 1.800,00 dólares';
const DOCUMENT_HINT = 'CPF (11 dígitos) o CNPJ (14 dígitos)';
const DATE_HINT = 'Elige una fecha futura para programarla.';

const EMPTY_ERRORS = ['Escribe el valor.', 'Escribe el documento del destinatario.'];

const SPOKEN_TODAY = 'Fecha de la transferencia: hoy, 31 de octubre de 2026';
const SPOKEN_NOV_15 = 'Fecha de la transferencia: 15 de noviembre de 2026';

afterEach(jest.restoreAllMocks);

async function openForm() {
  await renderTransferFlow();
  await settleRequests();
}

type Node = ReturnType<typeof screen.getByText>;

const SAFE_TOP = 24;

function useSafeTop(top: number) {
  const safeArea = jest.requireMock<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  jest.spyOn(safeArea, 'useSafeAreaInsets').mockReturnValue({ top, bottom: 0, left: 0, right: 0 });
}

// Campo, lo que se lee justo detrás (ayuda o error) y así hasta «Continuar».
function fieldsWith(amountNote: Node, documentNote: Node) {
  return [
    screen.getByLabelText('Valor'),
    amountNote,
    screen.getByLabelText('Documento del destinatario'),
    documentNote,
    screen.getByRole('button', { name: SPOKEN_TODAY }),
    screen.getByText(DATE_HINT),
    screen.getByRole('button', { name: 'Continuar' }),
  ];
}

// El Inicio sigue montado debajo: el formulario empieza en su «Volver».
function formReadingOrder() {
  const order = accessibleOrder();
  return order.slice(order.lastIndexOf('Volver'));
}

describe('NewTransferScreen: lectura de los campos', () => {
  it('los campos se anuncian con sus etiquetas y su ayuda, el valor hablado y sin leer el símbolo', async () => {
    await openForm();
    const symbol = currencySymbol('USD');

    await typeAmount('125000');

    expect(screen.getByLabelText('Valor')).toHaveAccessibilityValue({ text: '1.250,00 dólares' });
    expect(screen.getByLabelText('Documento del destinatario')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^Fecha de la transferencia/ })).toBeOnTheScreen();
    expect(formReadingOrder()).toEqual(expect.arrayContaining([AMOUNT_HINT, DOCUMENT_HINT, DATE_HINT]));
    expect(screen.getByText(symbol)).toBeOnTheScreen();
    expect(formReadingOrder().filter((name) => name.includes(symbol))).toEqual([]);
  });

  it('el campo de fecha se anuncia con hoy o con la fecha elegida', async () => {
    await openForm();

    expect(screen.getByRole('button', { name: SPOKEN_TODAY })).toHaveProp('accessibilityHint', 'Abre el calendario');

    await chooseDate({ year: 2026, month: 11, day: 15 });

    expect(screen.queryByRole('button', { name: SPOKEN_TODAY })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: SPOKEN_NOV_15 })).toHaveProp('accessibilityHint', 'Abre el calendario');
  });
});

describe('NewTransferScreen: errores anunciados', () => {
  it('los errores de campo tienen icono y se anuncian', async () => {
    const iconPaths = await alertIconPaths();
    await openForm();
    const announce = spyOnAnnouncements();

    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));

    for (const message of EMPTY_ERRORS) {
      const region = politeRegionWith(message);
      expect(region).toBeDefined();
      expect(region && pathsOf(region)).toEqual(iconPaths);
      expect(announce).toHaveBeenCalledWith(message);
    }
  });
});

describe('NewTransferScreen: teclado', () => {
  it.each([
    { os: 'ios' as const, padding: 300 + SAFE_TOP + layout.appBarHeight },
    { os: 'android' as const, padding: undefined },
  ])('el formulario desplaza y cierra el teclado al arrastrar o tocar fuera: «$os»', async ({ os, padding }) => {
    jest.replaceProperty(Platform, 'OS', os);
    useSafeTop(SAFE_TOP);
    await openForm();

    expect(formScrollView()).toHaveProp('keyboardShouldPersistTaps', 'handled');
    expect(formScrollView()).toHaveProp('keyboardDismissMode', 'on-drag');
    expect(await openKeyboard(os)).toBe(padding);
  });
});

describe('NewTransferScreen: orden de lectura', () => {
  it('el orden de lectura del formulario es Volver, título, campos con su ayuda o error y Continuar', async () => {
    await openForm();
    const header = ['Volver', 'Nueva transferencia'];

    expect(formReadingOrder()).toEqual([...header, AMOUNT_HINT, DOCUMENT_HINT, SPOKEN_TODAY, DATE_HINT, 'Continuar']);
    expectInTreeOrder(fieldsWith(screen.getByLabelText(AMOUNT_HINT), screen.getByText(DOCUMENT_HINT)));

    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));

    expect(formReadingOrder()).toEqual([...header, SPOKEN_TODAY, DATE_HINT, 'Continuar']);
    expectInTreeOrder(fieldsWith(screen.getByText(EMPTY_ERRORS[0]), screen.getByText(EMPTY_ERRORS[1])));
  });
});
