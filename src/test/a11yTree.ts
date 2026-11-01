import { screen } from '@testing-library/react-native';

// Nodo host del árbol renderizado: los hijos son otros nodos o textos sueltos.
type TreeNode = { type?: unknown; props: Record<string, unknown>; children: readonly (TreeNode | string)[] };

const VALUE_KEYS = ['text', 'now', 'min', 'max'] as const;

function isHiddenFromReader({ props }: TreeNode) {
  return props.importantForAccessibility === 'no-hide-descendants' || props.accessibilityElementsHidden === true;
}

function isAccessibleNode({ props }: TreeNode) {
  return props.accessible === true || Boolean(props.accessibilityRole) || Boolean(props.role);
}

function ownLabel({ props }: TreeNode) {
  const label = props.accessibilityLabel ?? props['aria-label'];
  return typeof label === 'string' ? label : undefined;
}

function textContent(node: TreeNode): string {
  return node.children.map((child) => (typeof child === 'string' ? child : textContent(child))).join('');
}

// Nombre que anuncia el lector: la etiqueta propia o, si no hay, el texto de sus descendientes.
function accessibleName(node: TreeNode) {
  return ownLabel(node) ?? textContent(node);
}

// Nombres de los nodos que lee el lector, en el orden del árbol (en profundidad). Un nodo que se lee
// se lee como uno solo, así que no se baja en él; los subárboles ocultos al lector se saltan enteros.
function namesInOrder(root: TreeNode, isRead: (node: TreeNode) => boolean): string[] {
  const names: string[] = [];
  const visit = (node: TreeNode) => {
    if (isHiddenFromReader(node)) return;
    if (isRead(node)) {
      names.push(accessibleName(node));
      return;
    }
    node.children.forEach((child) => typeof child !== 'string' && visit(child));
  };
  visit(root);
  return names;
}

// Nombres de los elementos accesibles (con `accessible` o un rol) en el orden del árbol.
export function accessibleOrder(root: TreeNode = screen.container): string[] {
  return namesInOrder(root, isAccessibleNode);
}

// Además de los elementos accesibles, el lector recorre los campos de texto y los textos sueltos.
function isReadNode(node: TreeNode) {
  if (node.type === 'TextInput') return true;
  return node.type === 'Text' && node.props.accessible !== false;
}

// Lo que recorre el lector en orden: como `accessibleOrder`, más los campos de texto (por su etiqueta)
// y los textos que no están dentro de un elemento accesible.
export function readingOrder(root: TreeNode = screen.container): string[] {
  return namesInOrder(root, (node) => isAccessibleNode(node) || isReadNode(node));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function propStrings({ props }: TreeNode) {
  const value = props.accessibilityValue;
  const valueParts = isRecord(value) ? VALUE_KEYS.map((key) => value[key]) : [];
  const candidates = [props.accessibilityLabel, props['aria-label'], props.accessibilityHint, ...valueParts];
  return candidates.filter((item) => item !== undefined && item !== null).map(String);
}

// Todas las cadenas del árbol, incluidas las ocultas al lector: textos, etiquetas, valores y pistas.
export function exposedStrings(root: TreeNode = screen.container): string[] {
  const strings: string[] = [];
  const visit = (node: TreeNode) => {
    strings.push(...propStrings(node));
    node.children.forEach((child) => (typeof child === 'string' ? strings.push(child) : visit(child)));
  };
  visit(root);
  return strings;
}
