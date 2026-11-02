/** @jest-environment node */
import { helperCopyProblems, type HelperGroup } from '@/test/helperCopies';

const TRANSFER_SCREENS = 'src/features/transfers/screens';
const LIST_SCREENS = 'src/features/transfer-list/screens';
const KEYBOARD_HELPERS = 'src/test/keyboard.ts';
const FOCUS = 'src/test/focus.ts';
const DIALOG = 'src/test/dialog.ts';
const SPINNERS = 'src/test/spinners.ts';
const HOME_HELPERS = 'src/test/homeHelpers.ts';
const SESSION_FLOW = 'src/test/transferSessionHelpers.ts';
const TIMERS = 'src/test/timers.ts';
const HAND_WRITTEN_TIMEOUT = /advanceTimersByTimeAsync\(15000\)/;
const INTEGRATION_PRESSES = [
  'transferList',
  'transferListStaleResponses',
  'transferListPrivacy',
  'transferListSession',
  'transferBlocking',
  'transferFlow',
].map((name) => `src/__tests__/${name}.test.tsx`);
const CONFIRM_PRESSES = ['.submit', '.responses', '.duplicate', '.uncertain', ''].map(
  (part) => `${TRANSFER_SCREENS}/ConfirmTransferScreen${part}.test.tsx`,
);
const HOME_TIMEOUTS = [
  'src/__tests__/transferBlocking.test.tsx',
  ...['errors', 'refreshErrors'].map((part) => `src/features/home/screens/HomeScreen.${part}.test.tsx`),
];
const SCREEN_TIMEOUTS = [
  `${LIST_SCREENS}/TransferListScreen.errors.test.tsx`,
  `${TRANSFER_SCREENS}/NewTransferScreen.loadErrors.test.tsx`,
  `${TRANSFER_SCREENS}/ConfirmTransferScreen.uncertain.test.tsx`,
  'src/services/api/client.errors.test.ts',
];

// Teclado, foco, diálogos y carga: ayudantes compartidos que los tests ya no redefinen.
const groups: HelperGroup[] = [
  {
    name: 'el teclado simulado vive en las utilidades de test y los tests de accesibilidad del formulario y de las hojas no lo redefinen',
    helpers: { KEYBOARD: KEYBOARD_HELPERS, openKeyboard: KEYBOARD_HELPERS, openKeyboardOver: KEYBOARD_HELPERS },
    files: [`${TRANSFER_SCREENS}/NewTransferScreen.a11y.test.tsx`, `${LIST_SCREENS}/TransferListScreen.sheetsA11y.test.tsx`],
  },
  {
    name: 'spyOnFocusedNodes vive en las utilidades de test y los tests del resultado no lo redefinen',
    helpers: { spyOnFocusedNodes: FOCUS },
    files: ['src/features/transfers/components/TransferResult.test.tsx', `${TRANSFER_SCREENS}/TransferResultScreen.test.tsx`],
  },
  {
    name: 'spyOnReaderFocus vive en las utilidades de test de foco y no en las del listado',
    helpers: { spyOnReaderFocus: FOCUS },
    files: ['', 'Sheet', 'Refresh', 'A11y'].map((part) => `src/test/transferList${part}Helpers.ts`),
    importers: [
      'src/features/transfer-list/components/DateFilterSheet.ios.test.tsx',
      ...['amount', 'refreshScroll', 'sheets', 'date', 'reapply', 'refresh'].map(
        (part) => `${LIST_SCREENS}/TransferListScreen.${part}.test.tsx`,
      ),
    ],
  },
  {
    name: 'spyOnFocusEvents vive en las utilidades de test de foco y no en las del Inicio',
    helpers: { spyOnFocusEvents: FOCUS },
    files: ['src/test/homeHelpers.ts'],
    importers: [
      'src/features/home/screens/HomeScreen.refresh.test.tsx',
      ...['validation', 'date', 'load'].map((part) => `${TRANSFER_SCREENS}/NewTransferScreen.${part}.test.tsx`),
      `${TRANSFER_SCREENS}/ConfirmTransferScreen.test.tsx`,
    ],
  },
  {
    name: 'spyOnFocusEvents ya no se importa de las utilidades del Inicio en los tests del listado',
    helpers: { spyOnFocusEvents: FOCUS },
    files: [],
    importers: ['search', 'dateClear', 'clear', 'amountErrors', 'counter'].map(
      (part) => `${LIST_SCREENS}/TransferListScreen.${part}.test.tsx`,
    ),
  },
  {
    name: 'spyOnAlert, chooseInDialog y dialogButton viven en las utilidades de test y los tests de cierre de sesión, caducidad y navegación del Inicio no los redefinen',
    helpers: {
      spyOnAlert: DIALOG,
      chooseInDialog: DIALOG,
      dialogButton: DIALOG,
      chooseInLastDialog: DIALOG,
    },
    files: ['logout', 'homeSession', 'homeNavigation'].map((name) => `src/__tests__/${name}.test.tsx`),
  },
  {
    name: 'holdFirstLoad vive en las utilidades del Inicio y los tests no lo redefinen ni retienen la respuesta en línea',
    helpers: { holdFirstLoad: 'src/test/homeHelpers.ts' },
    files: [
      'src/__tests__/homeNavigation.test.tsx',
      ...['a11y', 'load', 'concurrency'].map((part) => `src/features/home/screens/HomeScreen.${part}.test.tsx`),
    ],
    inlineCopies: [/mockImplementationOnce\(\(\) => \w+\.promise\)/],
  },
  {
    name: 'querySpinners y SPINNER_TYPES viven en las utilidades de test y los tests de carga y avisos no los redefinen',
    helpers: { SPINNER_TYPES: SPINNERS, querySpinners: SPINNERS },
    files: [
      'src/components/Banner.action.test.tsx',
      'src/features/home/screens/HomeScreen.load.test.tsx',
      `${TRANSFER_SCREENS}/NewTransferScreen.load.test.tsx`,
    ],
  },
  {
    name: 'SPINNER_TYPES ya no se redefine en los tests de destinos y de apariencia del Inicio',
    helpers: { SPINNER_TYPES: SPINNERS },
    files: ['src/__tests__/homeDestinations.test.tsx', 'src/features/home/screens/HomeScreen.appearance.test.tsx'],
  },
  {
    name: 'settleRequests, balanceRequests y balanceResponse se definen solo en las utilidades del Inicio y los tests del Inicio no los redefinen',
    helpers: { settleRequests: HOME_HELPERS, balanceRequests: HOME_HELPERS, balanceResponse: HOME_HELPERS },
    files: ['load', 'appearance', 'silent'].map((part) => `src/features/home/screens/HomeScreen.${part}.test.tsx`),
  },
  {
    name: 'pressButton vive en las utilidades de test y los tests de integración de transferencias y listado no lo redefinen',
    helpers: { pressButton: SESSION_FLOW },
    files: INTEGRATION_PRESSES,
    importers: INTEGRATION_PRESSES,
  },
  {
    name: 'pressButton ya no se redefine en los tests de la confirmación',
    helpers: { pressButton: SESSION_FLOW },
    files: CONFIRM_PRESSES,
    importers: CONFIRM_PRESSES,
  },
  {
    name: 'el literal de 15 s no se escribe a mano en los tests de errores del Inicio y de integración',
    helpers: { advancePastTimeout: TIMERS },
    files: HOME_TIMEOUTS,
    importers: HOME_TIMEOUTS,
    inlineCopies: [HAND_WRITTEN_TIMEOUT],
  },
  {
    name: 'el literal de 15 s no se escribe a mano en los tests de errores del listado, la nueva transferencia, la confirmación y el cliente',
    helpers: { advancePastTimeout: TIMERS },
    files: SCREEN_TIMEOUTS,
    importers: SCREEN_TIMEOUTS,
    inlineCopies: [HAND_WRITTEN_TIMEOUT],
  },
];

describe('ayudantes de interacción sin copias', () => {
  it.each(groups)('$name', (group) => {
    expect(helperCopyProblems(group)).toEqual({ notExported: [], redefined: [], notImported: [], inlined: [] });
  });
});
