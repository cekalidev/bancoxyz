import { render, screen } from '@testing-library/react-native';
import { createElement, type ComponentType } from 'react';

import { AlertIcon } from '@/components/icons/AlertIcon';
import { colors } from '@/theme';

type HostNode = ReturnType<typeof screen.getByText>;

// Trazos (`d`) de los iconos dibujados dentro del nodo, en orden.
export function pathsOf(node: HostNode): string[] {
  return node.queryAll((child) => typeof child.props.d === 'string').map((child) => child.props.d);
}

// Colores de trazo de los dibujos dentro del nodo, tal como los recibe el nativo.
export function strokeColorsOf(node: HostNode): unknown[] {
  return node.queryAll((child) => child.props.stroke !== undefined).map((child) => child.props.stroke.payload);
}

// Trazos del icono dibujado solo, para compararlo con el que aparece dentro de un componente.
export async function pathsOfIcon(Icon: ComponentType<{ color: string }>, color: string): Promise<string[]> {
  const { root, unmount } = await render(createElement(Icon, { color }));
  const paths = root ? pathsOf(root) : [];

  await unmount();
  return paths;
}

// Trazos del icono de alerta en el color de los errores, el que acompaña a los mensajes de error.
export function alertIconPaths(): Promise<string[]> {
  return pathsOfIcon(AlertIcon, colors.error);
}
