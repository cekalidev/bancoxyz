import { isHiddenFromAccessibility, screen } from '@testing-library/react-native';

export const TITLE = 'Filtrar por valor';
export const CLOSE_LABEL = 'Cerrar filtro de valor';

export function getModal() {
  const [modal] = screen.container.queryAll((node) => node.type === 'Modal');
  return modal;
}

export function getBackdrop() {
  const [backdrop] = screen.container.queryAll(
    (node) => typeof node.props.onClick === 'function' && node.props.accessibilityRole !== 'button',
  );
  return backdrop;
}

// Los nodos nunca se pasan a `expect`: un fallo intentaría imprimir su árbol entero.
export function isTitleNode(node: unknown) {
  if (typeof node !== 'object' || node === null || !('props' in node)) return false;
  const { props } = node;
  return typeof props === 'object' && props !== null && 'children' in props && props.children === TITLE;
}

export type HostNode = ReturnType<typeof screen.container.queryAll>[number];

export function isCloseNode(node: HostNode) {
  return node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === CLOSE_LABEL;
}

export function getModalPanel() {
  const panels = screen.container.queryAll((node) => node.props.accessibilityViewIsModal === true);
  expect(panels.length).toBe(1);
  return panels[0];
}

export function getHeaderRow() {
  const [header] = screen.container.queryAll(
    (node) => node.props.style?.flexDirection === 'row' && node.props.style?.justifyContent === 'space-between',
  );
  return header;
}

export function expectPanelHoldsTheSheet(panel: HostNode) {
  expect(panel.queryAll(isTitleNode).length).toBe(1);
  expect(panel.queryAll(isCloseNode).length).toBe(1);
  expect(panel.queryAll((node) => node.props.children === 'Contenido').length).toBe(1);
}

export function expectBackdropHiddenOutside(panel: HostNode) {
  const backdrop = getBackdrop();

  expect(backdrop).toBeDefined();
  expect(backdrop === panel).toBe(false);
  expect(panel.queryAll((node) => node === backdrop).length).toBe(0);
  // En iOS la propiedad modal hace que el lector ignore a los hermanos del nodo que la lleva.
  expect(panel.parent === null).toBe(false);
  expect(panel.parent === backdrop.parent).toBe(true);
  expect(backdrop.props.accessible).toBe(false);
  expect(backdrop.props.importantForAccessibility).toBe('no-hide-descendants');
  expect(backdrop.props.accessibilityElementsHidden).toBe(true);
  expect(isHiddenFromAccessibility(backdrop)).toBe(true);
}

export function expectCloseAfterTitle() {
  const readingOrder = screen.container
    .queryAll((node) => isTitleNode(node) || isCloseNode(node))
    .map(isTitleNode);

  expect(readingOrder).toEqual([true, false]);
}
