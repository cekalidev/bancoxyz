import { AccessibilityInfo, TextInput } from 'react-native';

type LabelledInput = { props: { accessibilityLabel?: string } };

let focusSpy: ReturnType<typeof spyOnFocus> | undefined;

function spyOnFocus() {
  return jest.spyOn(TextInput.prototype, 'focus').mockClear();
}

function isTextInput(context: unknown): context is LabelledInput {
  return context instanceof TextInput;
}

// Call before rendering (e.g. in `beforeEach`); clears calls left by earlier tests.
export function watchFocus(): void {
  focusSpy = spyOnFocus();
}

// Accessible labels of the text inputs that received `focus()`, in call order.
export function focusedFieldLabels(): (string | undefined)[] {
  if (!focusSpy) throw new Error('watchFocus() must run before focusedFieldLabels()');
  return focusSpy.mock.contexts.filter(isTextInput).map((input) => input.props.accessibilityLabel);
}

type FocusedNode = { props: { accessibilityLabel?: string; accessibilityRole?: string; children?: unknown } };

function isFocusedNode(node: unknown): node is FocusedNode {
  return typeof node === 'object' && node !== null && 'props' in node;
}

// Espía las peticiones de llevar el foco del lector a un nodo; devuelve cómo leer cada nodo enfocado, en orden.
function spyOnReaderFocusAs<T>(read: (node: FocusedNode | undefined) => T) {
  const sendEvent = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockClear();
  return () =>
    sendEvent.mock.calls
      .filter(([, type]) => type === 'focus')
      .map(([node]) => read(isFocusedNode(node) ? node : undefined));
}

// Nodos a los que se pidió mover el foco del lector de pantalla.
export function spyOnFocusedNodes() {
  return spyOnReaderFocusAs((node) => node?.props);
}

// Nombre del nodo al que se pidió llevar el foco: su etiqueta o, en un texto, el propio texto.
function focusTargetName(node: FocusedNode | undefined) {
  if (!node) return undefined;
  const { accessibilityLabel, children } = node.props;
  return accessibilityLabel ?? (typeof children === 'string' ? children : undefined);
}

// Nombres de los nodos que recibieron el foco del lector, en orden (también títulos sin etiqueta).
export function spyOnReaderFocus() {
  return spyOnReaderFocusAs(focusTargetName);
}

// Etiquetas de los nodos a los que se pidió mover el foco del lector de pantalla.
export function spyOnFocusEvents() {
  return spyOnReaderFocusAs((node) => node?.props.accessibilityLabel);
}
