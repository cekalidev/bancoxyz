import { act } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

type AlertSpy = ReturnType<typeof spyOnAlert>;

// Espía los diálogos del sistema sin mostrarlos.
export function spyOnAlert() {
  return jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
}

function buttonIn(buttons: AlertButton[] | undefined, text: string) {
  const button = (buttons ?? []).find((candidate) => candidate.text === text);
  if (!button) throw new Error(`El diálogo no tiene el botón ${text}`);
  return button;
}

// Botón con el texto dado en el primer diálogo mostrado.
export function dialogButton(alert: AlertSpy, text: string): AlertButton {
  return buttonIn(alert.mock.calls[0]?.[2], text);
}

// Pulsa un botón del primer diálogo mostrado como lo haría el sistema.
export async function chooseInDialog(alert: AlertSpy, text: string) {
  const button = dialogButton(alert, text);
  await act(async () => button.onPress?.());
}

// Pulsa un botón del último diálogo mostrado como lo haría el sistema.
export async function chooseInLastDialog(alert: AlertSpy, text: string) {
  const button = buttonIn(alert.mock.calls.at(-1)?.[2], text);
  await act(async () => button.onPress?.());
}
