import { TextInput } from 'react-native';

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
