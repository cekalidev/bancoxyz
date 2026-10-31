const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const SKELETON_MESSAGE = 'Usa skeletons, no spinners';
const THEME_MESSAGE = 'Usa los colores del tema (src/theme)';
const WEIGHT_MESSAGE = 'Usa la familia tipográfica del tema en lugar de fontWeight';
const ROUTE_MESSAGE = 'Las rutas solo reexportan una pantalla de una funcionalidad';

const spinnerSelectors = [
  { selector: "JSXIdentifier[name='ActivityIndicator']", message: SKELETON_MESSAGE },
];

const colorSelectors = [
  "Literal[value=/^#[0-9a-fA-F]{3,8}$/]",
  'Literal[value=/^rgba?\\(/]',
  "TemplateElement[value.raw=/^#[0-9a-fA-F]{3,8}$/]",
  'TemplateElement[value.raw=/^rgba?\\(/]',
].map((selector) => ({ selector, message: THEME_MESSAGE }));

const weightSelectors = [
  "Property[key.name='fontWeight']",
  "Property[key.value='fontWeight']",
].map((selector) => ({ selector, message: WEIGHT_MESSAGE }));

const routeSelectors = [
  {
    selector:
      "Program > :not(ExportNamedDeclaration[exportKind='value'][source.value=/^@\\/features\\/[a-z-]+$/][specifiers.length=1][specifiers.0.exported.name='default'])",
    message: ROUTE_MESSAGE,
  },
];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'ios/*', 'android/*', '.expo/*', 'coverage/*'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'max-lines': ['error', { max: 150 }],
      'max-lines-per-function': ['error', { max: 40 }],
      'max-params': ['error', 3],
      complexity: ['error', 10],
      'react/jsx-max-depth': ['error', { max: 3 }],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react-native', importNames: ['ActivityIndicator'], message: SKELETON_MESSAGE },
          ],
        },
      ],
      'no-restricted-syntax': ['error', ...spinnerSelectors, ...colorSelectors, ...weightSelectors],
    },
  },
  {
    files: ['src/theme/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', ...spinnerSelectors, ...weightSelectors],
    },
  },
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...spinnerSelectors,
        ...colorSelectors,
        ...weightSelectors,
        ...routeSelectors,
      ],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}'],
    rules: {
      'max-lines': ['error', { max: 250 }],
    },
  },
]);
