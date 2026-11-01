import { render } from '@testing-library/react-native';
import { fireEvent, screen } from 'expo-router/testing-library';

import { AlertIcon } from '@/components/icons/AlertIcon';
import { finishAttempt } from '@/features/transfers/transferActions';
import { reply } from '@/test/fetchMock';
import { politeRegionWith, settleRequests, spyOnAnnouncements } from '@/test/homeHelpers';
import { accessibleOrder } from '@/test/a11yTree';
import { goToConfirm, renderTransferFlow } from '@/test/transferHelpers';
import { colors } from '@/theme';

jest.mock('@/components/useDatePicker', () =>
  jest.requireActual<typeof import('@/test/datePickerMock')>('@/test/datePickerMock').datePickerMockFactory(),
);

const NBSP = ' ';
const MONEY = `US$${NBSP}1.250,00`;
const DUPLICATE = 'Ya enviaste una transferencia igual hace 2 min. ¿Quieres enviar otra?';
const SPOKEN_SUMMARY = 'Vas a transferir 1.250,00 dólares al CPF 123.456.789-00, hoy, 31 de octubre de 2026';
const REJECTED = 'No pudimos hacer la transferencia. Revisa los datos e inténtalo de nuevo.';

afterEach(jest.restoreAllMocks);

type Node = ReturnType<typeof screen.getByText>;

function pathsOf(node: Node) {
  return node.queryAll((child) => typeof child.props.d === 'string').map((child) => String(child.props.d));
}

async function alertIconPaths() {
  const { root, unmount } = await render(<AlertIcon color={colors.error} />);
  const paths = root ? pathsOf(root) : [];
  await unmount();
  return paths;
}

// Llega a la confirmación de 1.250,00 USD al CPF de prueba para hoy, igual a un envío
// con éxito de hace 2 min, y la envía otra vez: la API la rechaza con un 400.
async function confirmWithBothNotices() {
  await renderTransferFlow({ transfer: reply(400, { message: 'Bad Request: dados inválidos' }) });
  await settleRequests();
  finishAttempt({
    draft: { cents: 125000, currency: 'USD', document: '12345678900', date: { year: 2026, month: 10, day: 31 } },
    outcome: 'immediate',
    finishedAt: Date.now() - 2 * 60000,
  });
  await goToConfirm();
  await fireEvent.press(screen.getByRole('button', { name: 'Enviar otra igual' }));
  await settleRequests();
}

// El formulario sigue montado debajo: la confirmación empieza en su «Volver».
function confirmReadingOrder() {
  const order = accessibleOrder();
  return order.slice(order.lastIndexOf('Volver'));
}

// Posición del nodo en el recorrido del árbol, que es el orden visual.
function treeIndex(node: Node) {
  return screen.container.queryAll(() => true).indexOf(node);
}

function expectInTreeOrder(nodes: Node[]) {
  const positions = nodes.map(treeIndex);
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
  expect(new Set(positions).size).toBe(nodes.length);
}

// «Volver» de la confirmación: el del formulario de debajo va antes en el árbol.
function confirmBackButton() {
  const back = screen.getAllByRole('button', { name: 'Volver' }).at(-1);
  if (!back) throw new Error('La confirmación no tiene «Volver»');
  return back;
}

async function openConfirmation() {
  await renderTransferFlow();
  await settleRequests();
  await goToConfirm();
}

describe('ConfirmTransferScreen: avisos anunciados', () => {
  it('los avisos de duplicado y de rechazo tienen icono y se anuncian', async () => {
    const iconPaths = await alertIconPaths();
    const announce = spyOnAnnouncements('ios');

    await confirmWithBothNotices();

    for (const message of [DUPLICATE, REJECTED]) {
      const region = politeRegionWith(message);
      expect(region).toBeDefined();
      expect(region && pathsOf(region)).toEqual(iconPaths);
      expect(announce).toHaveBeenCalledWith(message);
    }
  });
});

describe('ConfirmTransferScreen: título y resumen', () => {
  it('el título es encabezado y el resumen un solo elemento', async () => {
    await openConfirmation();

    expect(screen.getByRole('header', { name: 'Confirmar transferencia' })).toBeOnTheScreen();
    expect(confirmReadingOrder()).toEqual([
      'Volver',
      'Confirmar transferencia',
      SPOKEN_SUMMARY,
      'Confirmar transferencia',
      'Editar datos',
    ]);
  });
});

describe('ConfirmTransferScreen: orden de lectura', () => {
  it('el orden de la confirmación incluye los avisos en su sitio', async () => {
    await confirmWithBothNotices();

    expect(confirmReadingOrder()).toEqual([
      'Volver',
      'Confirmar transferencia',
      SPOKEN_SUMMARY,
      'Enviar otra igual',
      'Editar datos',
    ]);
    expectInTreeOrder([
      confirmBackButton(),
      screen.getByRole('header', { name: 'Confirmar transferencia' }),
      screen.getByText(DUPLICATE),
      screen.getByLabelText(SPOKEN_SUMMARY),
      screen.getByText(REJECTED),
      screen.getByRole('button', { name: 'Enviar otra igual' }),
      screen.getByRole('button', { name: 'Editar datos' }),
    ]);
  });
});

describe('ConfirmTransferScreen: fuente grande', () => {
  it('el importe de la confirmación no limita sus líneas', async () => {
    await openConfirmation();

    const amount = screen.getByText(MONEY);
    expect(amount).not.toHaveProp('numberOfLines');
    expect(amount).not.toHaveProp('adjustsFontSizeToFit');
  });
});
