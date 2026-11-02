/** @jest-environment node */
import { definitionCounts, helperCopyProblems, type HelperGroup } from '@/test/helperCopies';

const A11Y_TREE = 'src/test/a11yTree.ts';
const HOME_SCREENS = 'src/features/home/screens';
const TRANSFER_SCREENS = 'src/features/transfers/screens';
const LIST_SCREENS = 'src/features/transfer-list/screens';
const ICON_PATHS = 'src/test/iconPaths.ts';
const HOME_HELPERS = 'src/test/homeHelpers.ts';
const README_SECTIONS = 'src/test/readmeSections.ts';
const readmeTests = (names: string[]) => names.map((name) => `src/__tests__/${name}.test.ts`);
const README_TESTS = readmeTests(['readme', 'readmeScreenshots', 'readmeDelivery']);
const iconHelpers = { pathsOf: ICON_PATHS, strokeColorsOf: ICON_PATHS, pathsOfIcon: ICON_PATHS };

const groups: HelperGroup[] = [
  {
    name: 'treeIndex vive en las utilidades de test y los tests del Inicio no lo redefinen',
    helpers: { treeIndex: A11Y_TREE },
    files: [
      'src/__tests__/homeDestinations.test.tsx',
      `${HOME_SCREENS}/HomeScreen.refreshErrors.test.tsx`,
      `${HOME_SCREENS}/HomeScreen.a11y.test.tsx`,
    ],
  },
  {
    name: 'treeIndex ya no se redefine en los tests del formulario de nueva transferencia',
    helpers: { treeIndex: A11Y_TREE },
    files: ['load', 'document', 'date', 'amount'].map(
      (part) => `${TRANSFER_SCREENS}/NewTransferScreen.${part}.test.tsx`,
    ),
  },
  {
    name: 'treeIndex y expectInTreeOrder viven en las utilidades de test y los tests de accesibilidad del formulario y de la confirmación no los redefinen',
    helpers: { treeIndex: A11Y_TREE, expectInTreeOrder: A11Y_TREE },
    files: [`${TRANSFER_SCREENS}/NewTransferScreen.a11y.test.tsx`, `${TRANSFER_SCREENS}/ConfirmTransferScreen.a11y.test.tsx`],
  },
  {
    name: 'treeIndex ya no se redefine en los tests de la confirmación, el resultado y el listado',
    helpers: { treeIndex: A11Y_TREE },
    files: [
      `${TRANSFER_SCREENS}/ConfirmTransferScreen.test.tsx`,
      `${TRANSFER_SCREENS}/TransferResultScreen.test.tsx`,
      `${LIST_SCREENS}/TransferListScreen.load.test.tsx`,
      `${LIST_SCREENS}/TransferListScreen.emptyRefresh.test.tsx`,
      `${LIST_SCREENS}/TransferListScreen.refreshErrors.test.tsx`,
    ],
  },
  {
    name: 'politeRegions vive en las utilidades de test y los tests de cierre de sesión, login y errores del listado no lo redefinen',
    helpers: { politeRegions: A11Y_TREE },
    files: [
      'src/__tests__/logout.test.tsx',
      'src/features/auth/screens/LoginScreen.a11y.test.tsx',
      `${LIST_SCREENS}/TransferListScreen.errors.test.tsx`,
    ],
  },
  {
    name: 'pathsOf, strokeColorsOf y pathsOfIcon viven en las utilidades de test y los tests de campos de texto no los redefinen',
    helpers: iconHelpers,
    files: ['TextField', 'PasswordField', 'DateField'].map((name) => `src/components/${name}.test.tsx`),
  },
  {
    name: 'pathsOf, strokeColorsOf y pathsOfIcon ya no se redefinen en los tests de aviso, chip, botón de borrar y búsqueda',
    helpers: iconHelpers,
    files: [
      'src/components/Banner.test.tsx',
      'src/components/FilterChip.test.tsx',
      'src/components/ClearButton.test.tsx',
      'src/features/transfer-list/components/SearchField.test.tsx',
    ],
  },
  {
    name: 'pathsOfIcon ya no se redefine en los tests del estado vacío y del resultado',
    helpers: { pathsOfIcon: ICON_PATHS },
    files: ['src/components/EmptyState.test.tsx', 'src/features/transfers/components/TransferResult.test.tsx'],
  },
  {
    name: 'alertIconPaths, pathsOf e iconPathsIn ya no se redefinen en los tests de formulario, confirmación y listado',
    helpers: {
      alertIconPaths: ICON_PATHS,
      pathsOf: ICON_PATHS,
      iconPathsIn: 'src/test/transferListA11yHelpers.ts',
    },
    files: [
      `${TRANSFER_SCREENS}/NewTransferScreen.a11y.test.tsx`,
      `${TRANSFER_SCREENS}/ConfirmTransferScreen.a11y.test.tsx`,
      `${LIST_SCREENS}/TransferListScreen.amountErrors.test.tsx`,
      `${LIST_SCREENS}/TransferListScreen.refreshErrors.test.tsx`,
    ],
  },
  {
    name: 'renderFilteredList y REAL_NAMES viven en las utilidades de test y los tests de recarga y reaplicación no los redefinen',
    helpers: {
      renderFilteredList: 'src/test/transferListSheetHelpers.ts',
      REAL_NAMES: 'src/test/transferListRefreshHelpers.ts',
    },
    files: ['refreshErrors', 'reapply', 'refreshConcurrency', 'refresh'].map(
      (part) => `${LIST_SCREENS}/TransferListScreen.${part}.test.tsx`,
    ),
  },
  {
    name: 'settleRequests ya no se define en las utilidades del listado y las utilidades y los tests de integración del listado usan el del Inicio',
    helpers: { settleRequests: HOME_HELPERS },
    files: ['src/test/transferListHelpers.ts'],
    importers: [
      'src/test/transferListA11yHelpers.ts',
      ...['transferListSession', 'transferListPrivacy', 'transferList'].map((name) => `src/__tests__/${name}.test.tsx`),
    ],
  },
  {
    name: 'settleRequests ya no se importa de las utilidades del listado en los tests de pantalla',
    helpers: { settleRequests: HOME_HELPERS },
    files: [],
    importers: [
      'refreshConcurrency',
      'errors',
      'rows',
      'refreshErrors',
      'reapply',
      'refreshScroll',
      'emptyRefresh',
      'refresh',
    ].map((part) => `${LIST_SCREENS}/TransferListScreen.${part}.test.tsx`),
  },
  {
    name: 'readReadme, readmeLines, readmeSection y markdownTableRows viven en las utilidades de test y los tests del README no los redefinen ni leen el archivo en línea',
    helpers: {
      readReadme: README_SECTIONS,
      readmeLines: README_SECTIONS,
      readmeSection: README_SECTIONS,
      markdownTableRows: README_SECTIONS,
    },
    files: README_TESTS,
    inlineCopies: [/readText\('README\.md'\)/],
  },
  {
    name: 'los tests del README importan readmeSection de las utilidades de test',
    helpers: { readmeSection: README_SECTIONS },
    files: [],
    importers: README_TESTS,
  },
  {
    name: 'los tests del README que leen tablas importan markdownTableRows de las utilidades de test',
    helpers: { markdownTableRows: README_SECTIONS },
    files: [],
    importers: readmeTests(['readme', 'readmeScreenshots']),
  },
];

describe('ayudantes de test sin copias', () => {
  it.each(groups)('$name', (group) => {
    expect(helperCopyProblems(group)).toEqual({ notExported: [], redefined: [], notImported: [], inlined: [] });
  });
});

// La variante asíncrona de `pressButton` del selector de fecha es otro ayudante: queda fuera del recuento.
const SHARED_HELPERS = [
  'treeIndex',
  'expectInTreeOrder',
  'politeRegions',
  'pathsOf',
  'strokeColorsOf',
  'pathsOfIcon',
  'alertIconPaths',
  'iconPathsIn',
  'renderFilteredList',
  'REAL_NAMES',
  'KEYBOARD',
  'openKeyboard',
  'spyOnReaderFocus',
  'spyOnFocusEvents',
  'spyOnFocusedNodes',
  'spyOnAlert',
  'chooseInDialog',
  'dialogButton',
  'holdFirstLoad',
  'querySpinners',
  'SPINNER_TYPES',
  'settleRequests',
  'balanceRequests',
  'balanceResponse',
  'readReadme',
  'readmeLines',
  'readmeSection',
  'markdownTableRows',
];

describe('ayudantes compartidos', () => {
  it('cada ayudante compartido se define una sola vez en src', () => {
    const once = Object.fromEntries(SHARED_HELPERS.map((helper) => [helper, 1]));
    expect(definitionCounts(SHARED_HELPERS)).toEqual(once);
  });
});
