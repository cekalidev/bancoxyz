import { renderHook } from '@testing-library/react-native';

import { useAppForeground } from '@/hooks/useAppForeground';
import { type AppStateCapture, captureAppState } from '@/test/appStateMock';

type Props = { onForeground: () => void; enabled: boolean };

let appState: AppStateCapture;

beforeEach(() => {
  appState = captureAppState();
});

function renderForeground(onForeground: () => void, enabled = true) {
  return renderHook(({ onForeground: callback, enabled: active }: Props) => useAppForeground(callback, active), {
    initialProps: { onForeground, enabled },
  });
}

describe('useAppForeground al volver a activa', () => {
  it('avisa al pasar de segundo plano a activa', async () => {
    const onForeground = jest.fn();
    await renderForeground(onForeground);
    expect(appState.subscriptions()).toHaveLength(1);

    await appState.emit('background');
    expect(onForeground).not.toHaveBeenCalled();

    await appState.emit('active');
    expect(onForeground).toHaveBeenCalledTimes(1);
  });

  it('el inactivo momentáneo no avisa', async () => {
    const onForeground = jest.fn();
    await renderForeground(onForeground);
    expect(appState.subscriptions()).toHaveLength(1);

    await appState.emit('inactive');
    await appState.emit('active');

    expect(onForeground).not.toHaveBeenCalled();
  });
});

describe('useAppForeground con varias transiciones', () => {
  it('la secuencia inactivo, segundo plano, activa avisa una vez', async () => {
    const first = jest.fn();
    const second = jest.fn();
    const { rerender } = await renderForeground(first);

    await appState.emit('inactive');
    await rerender({ onForeground: second, enabled: true });
    await appState.emit('background');
    await appState.emit('active');

    expect(appState.subscriptions()).toHaveLength(1);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);

    await appState.emit('inactive');
    await appState.emit('active');
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe('useAppForeground deshabilitado', () => {
  it('deshabilitado no avisa', async () => {
    const onForeground = jest.fn();
    const { rerender } = await renderForeground(onForeground, false);

    await appState.emit('background');
    await appState.emit('active');
    expect(appState.subscriptions()).toHaveLength(1);
    expect(onForeground).not.toHaveBeenCalled();

    await rerender({ onForeground, enabled: true });
    await appState.emit('active');
    expect(onForeground).not.toHaveBeenCalled();

    await appState.emit('background');
    await appState.emit('active');
    expect(appState.subscriptions()).toHaveLength(1);
    expect(onForeground).toHaveBeenCalledTimes(1);
  });
});

describe('useAppForeground al desmontar', () => {
  it('quita la suscripción al desmontar', async () => {
    const onForeground = jest.fn();
    const { unmount } = await renderForeground(onForeground);
    expect(appState.subscriptions()).toHaveLength(1);
    const [subscription] = appState.subscriptions();
    expect(subscription.remove).not.toHaveBeenCalled();

    await unmount();
    expect(subscription.remove).toHaveBeenCalledTimes(1);

    await appState.emit('background');
    await appState.emit('active');
    expect(onForeground).not.toHaveBeenCalled();
  });
});
