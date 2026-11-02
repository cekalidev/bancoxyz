import { act, fireEvent, screen, within } from 'expo-router/testing-library';
import { DeviceEventEmitter, StyleSheet } from 'react-native';

type Node = ReturnType<typeof screen.getByText>;

// Pantalla de 800 de alto con el teclado desde el punto 500: tapa 300 por abajo.
const SCREEN_FRAME = { x: 0, y: 0, width: 360, height: 800 };
export const KEYBOARD = { screenX: 0, screenY: 500, width: 360, height: 300 };

// El scroll del formulario: el que contiene «Continuar».
export function formScrollView() {
  const scrolls = screen.container.queryAll((node) => node.type === 'RCTScrollView');
  const form = scrolls.find((node) => within(node).queryByRole('button', { name: 'Continuar' }) !== null);
  if (!form) throw new Error('No hay scroll con el formulario');
  return form;
}

// Coloca el contenedor que esquiva el teclado y abre el teclado; devuelve el hueco que deja abajo.
export async function openKeyboardOver(avoiding: Node, os: 'ios' | 'android' = 'ios') {
  await fireEvent(avoiding, 'layout', { persist: () => undefined, nativeEvent: { layout: SCREEN_FRAME } });
  const event = os === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
  await act(async () => {
    DeviceEventEmitter.emit(event, { endCoordinates: KEYBOARD, duration: 0, easing: 'keyboard' });
  });
  return StyleSheet.flatten(avoiding.props.style).paddingBottom;
}

// Abre el teclado sobre el contenedor del formulario.
export async function openKeyboard(os: 'ios' | 'android') {
  const avoiding = formScrollView().parent;
  if (!avoiding) throw new Error('El scroll del formulario no tiene contenedor');
  return openKeyboardOver(avoiding, os);
}
