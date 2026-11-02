const SKELETON_MESSAGE = 'Usa skeletons, no spinners';
const THEME_MESSAGE = 'Usa los colores del tema (src/theme)';
const WEIGHT_MESSAGE = 'Usa la familia tipográfica del tema en lugar de fontWeight';
const ROUTE_MESSAGE =
  'La capa app solo puede importar el índice público de una funcionalidad: las rutas solo reexportan una pantalla de una funcionalidad';
const TOKEN_MESSAGE = 'El token sale siempre de la sesión; no lo escribas en el código';
const API_NAMES_MESSAGE = 'Los nombres de la API solo viven en el cliente de la API (src/services/api)';
const API_NAMES = '/^(payeer|payeerDocument|accountBalance|transferDate)$/';

const spinnerSelectors = [{ selector: "JSXIdentifier[name='ActivityIndicator']", message: SKELETON_MESSAGE }];

const colorSelectors = [
  'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
  'Literal[value=/^rgba?\\(/]',
  'TemplateElement[value.raw=/^#[0-9a-fA-F]{3,8}$/]',
  'TemplateElement[value.raw=/^rgba?\\(/]',
].map((selector) => ({ selector, message: THEME_MESSAGE }));

const weightSelectors = ["Property[key.name='fontWeight']", "Property[key.value='fontWeight']"].map(
  (selector) => ({ selector, message: WEIGHT_MESSAGE }),
);

const tokenSelectors = ['Literal[value=/fake-jwt-token/]', 'TemplateElement[value.raw=/fake-jwt-token/]'].map(
  (selector) => ({ selector, message: TOKEN_MESSAGE }),
);

const apiNameSelectors = [
  `Identifier[name=${API_NAMES}]`,
  `Property > Literal.key[value=${API_NAMES}]`,
  `TSPropertySignature > Literal.key[value=${API_NAMES}]`,
  `MemberExpression[computed=true] > Literal.property[value=${API_NAMES}]`,
].map((selector) => ({ selector, message: API_NAMES_MESSAGE }));

const routeSelectors = [
  {
    selector:
      "Program > :not(ExportNamedDeclaration[exportKind='value'][source.value=/^@\\/features\\/[a-z-]+$/][specifiers.length=1][specifiers.0.exported.name='default'])",
    message: ROUTE_MESSAGE,
  },
];

const spinnerImport = {
  name: 'react-native',
  importNames: ['ActivityIndicator'],
  message: SKELETON_MESSAGE,
};

module.exports = {
  apiNameSelectors,
  colorSelectors,
  routeSelectors,
  spinnerImport,
  spinnerSelectors,
  tokenSelectors,
  weightSelectors,
};
