import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { useReducedMotion, useReducedMotionSetting } from '@/components/useReducedMotion';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useReducedMotion', () => {
  it('por defecto no reduce el movimiento', async () => {
    const { result } = await renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);
  });

  it('reduce el movimiento si el sistema ya lo tiene activado al montar', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValueOnce(true);

    const { result } = await renderHook(() => useReducedMotion());

    await waitFor(() => expect(result.current).toBe(true));
  });
});

describe('useReducedMotion suscripción', () => {
  it('sigue los cambios de la preferencia mientras está montado', async () => {
    let subscribedEvent = '';
    let notifyChange: (enabled: boolean) => void = () => {};
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementationOnce((event, handler) => {
      subscribedEvent = event;
      notifyChange = handler;
      return { remove: jest.fn() };
    });

    const { result } = await renderHook(() => useReducedMotion());

    expect(subscribedEvent).toBe('reduceMotionChanged');
    await act(async () => notifyChange(true));
    expect(result.current).toBe(true);

    await act(async () => notifyChange(false));
    expect(result.current).toBe(false);
  });

  it('deja de escuchar la preferencia al desmontarse', async () => {
    const remove = jest.fn();
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValueOnce({ remove });

    const { unmount } = await renderHook(() => useReducedMotion());
    expect(remove).not.toHaveBeenCalled();

    await unmount();

    expect(remove).toHaveBeenCalledTimes(1);
  });
});

describe('useReducedMotionSetting', () => {
  it('el ajuste es desconocido hasta leer la preferencia', async () => {
    let resolvePreference: (enabled: boolean) => void = () => {};
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockReturnValueOnce(
      new Promise<boolean>((resolve) => {
        resolvePreference = resolve;
      }),
    );

    const { result } = await renderHook(() => useReducedMotionSetting());

    expect(result.current).toBeNull();

    await act(async () => resolvePreference(false));
    expect(result.current).toBe(false);
  });
});
