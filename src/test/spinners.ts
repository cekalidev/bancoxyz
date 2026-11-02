import { screen } from '@testing-library/react-native';

// Tipos nativos del indicador giratorio de React Native en iOS, Android y en los tests.
export const SPINNER_TYPES = ['RCTActivityIndicatorView', 'AndroidProgressBar', 'ActivityIndicator'];

type Node = ReturnType<typeof screen.getByText>;

const hasProgressRole = (node: Node) =>
  node.props.accessibilityRole === 'progressbar' || node.props.role === 'progressbar';

// Indicadores giratorios en pantalla; con `withProgressRole`, también cualquier nodo con rol de progreso.
export function querySpinners({ withProgressRole = false } = {}) {
  return screen.container.queryAll(
    (node) => (withProgressRole && hasProgressRole(node)) || SPINNER_TYPES.includes(String(node.type)),
  );
}
