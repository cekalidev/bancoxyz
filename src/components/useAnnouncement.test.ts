import { renderHook } from '@testing-library/react-native';
import { AccessibilityInfo, Platform } from 'react-native';

import { useAnnouncement } from '@/components/useAnnouncement';

const MESSAGE = 'No pudimos cargar tu saldo.';
const OTHER_MESSAGE = 'Sin conexión a internet.';

type Props = { message: string | null; repeatKey: number };

function spyOnAnnouncements() {
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  announce.mockClear();
  return announce;
}

function renderAnnouncement(initialProps: Props) {
  return renderHook(({ message, repeatKey }: Props) => useAnnouncement(message, repeatKey), {
    initialProps,
  });
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useAnnouncement en iOS', () => {
  it('en iOS vuelve a anunciar el mismo mensaje cuando cambia la clave', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const announce = spyOnAnnouncements();
    const { rerender } = await renderAnnouncement({ message: MESSAGE, repeatKey: 1 });

    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenLastCalledWith(MESSAGE);

    await rerender({ message: MESSAGE, repeatKey: 2 });

    expect(announce).toHaveBeenCalledTimes(2);
    expect(announce).toHaveBeenLastCalledWith(MESSAGE);

    await rerender({ message: MESSAGE, repeatKey: 2 });

    expect(announce).toHaveBeenCalledTimes(2);
  });
});

describe('useAnnouncement sin mensaje', () => {
  it.each(['ios', 'android'] as const)('no anuncia sin mensaje (%s)', async (os) => {
    jest.replaceProperty(Platform, 'OS', os);
    const announce = spyOnAnnouncements();
    const { rerender } = await renderAnnouncement({ message: null, repeatKey: 0 });

    await rerender({ message: null, repeatKey: 1 });
    await rerender({ message: null, repeatKey: 2 });

    expect(announce).not.toHaveBeenCalled();
  });
});

describe('useAnnouncement en Android', () => {
  it('en Android solo anuncia a mano cuando el mensaje se repite con otra clave', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const announce = spyOnAnnouncements();
    const { rerender } = await renderAnnouncement({ message: MESSAGE, repeatKey: 1 });

    await rerender({ message: OTHER_MESSAGE, repeatKey: 2 });

    expect(announce).not.toHaveBeenCalled();

    await rerender({ message: OTHER_MESSAGE, repeatKey: 3 });

    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenLastCalledWith(OTHER_MESSAGE);
  });

  it('en Android no anuncia a mano si el mensaje vuelve tras desaparecer', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const announce = spyOnAnnouncements();
    const { rerender } = await renderAnnouncement({ message: MESSAGE, repeatKey: 1 });

    await rerender({ message: null, repeatKey: 1 });
    await rerender({ message: MESSAGE, repeatKey: 2 });

    expect(announce).not.toHaveBeenCalled();
  });
});
