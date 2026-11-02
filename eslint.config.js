const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const { layerImportBlocks, layerZones } = require('./eslint/layers');
const {
  apiNameSelectors,
  colorSelectors,
  routeSelectors,
  spinnerImport,
  spinnerSelectors,
  tokenSelectors,
  weightSelectors,
} = require('./eslint/restrictedSyntax');

const testSyntax = [...spinnerSelectors, ...colorSelectors, ...weightSelectors];
const apiClientSyntax = [...testSyntax, ...tokenSelectors];
const appSyntax = [...apiClientSyntax, ...apiNameSelectors];
const themeSyntax = [...spinnerSelectors, ...weightSelectors, ...tokenSelectors, ...apiNameSelectors];

const testFiles = ['**/*.test.{ts,tsx}', 'src/test/**', 'src/__tests__/**', '**/*.cases.ts'];

function restrictedImports({ paths = [], patterns = [] } = {}) {
  const options = { paths: [spinnerImport, ...paths] };
  return ['error', patterns.length > 0 ? { ...options, patterns } : options];
}

const layerRules = {
  'import/no-restricted-paths': ['error', { basePath: __dirname, zones: layerZones }],
};

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'ios/*', 'android/*', '.expo/*', 'coverage/*'],
  },
  {
    files: ['eslint.config.js', 'eslint/**/*.js'],
    languageOptions: { globals: { __dirname: 'readonly' } },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'max-lines': ['error', { max: 150 }],
      'max-lines-per-function': ['error', { max: 40 }],
      'max-params': ['error', 3],
      complexity: ['error', 10],
      'react/jsx-max-depth': ['error', { max: 3 }],
      'no-console': 'error',
      'no-restricted-imports': restrictedImports(),
      'no-restricted-syntax': ['error', ...appSyntax],
      ...layerRules,
    },
  },
  {
    files: ['src/theme/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', ...themeSyntax],
    },
  },
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', ...appSyntax, ...routeSelectors],
    },
  },
  {
    files: ['src/services/api/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', ...apiClientSyntax],
    },
  },
  ...layerImportBlocks.map(({ files, ...rules }) => ({
    files,
    rules: { 'no-restricted-imports': restrictedImports(rules) },
  })),
  {
    files: testFiles,
    rules: {
      'no-console': 'off',
      'import/no-restricted-paths': 'off',
      'no-restricted-imports': restrictedImports(),
      'no-restricted-syntax': ['error', ...testSyntax],
    },
  },
  {
    files: ['src/theme/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', ...spinnerSelectors, ...weightSelectors],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}'],
    rules: {
      'max-lines': ['error', { max: 250 }],
    },
  },
]);
