import { renderHook } from '@testing-library/react-native';
import { AccessibilityInfo, Platform } from 'react-native';

import { useChangeAnnouncement } from '@/components/useChangeAnnouncement';

const FIRST_TEXT = '3 transferencias';
const SECOND_TEXT = '1 de 3 transferencias';

function spyOnAnnouncements() {
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  announce.mockClear();
  return announce;
}

function renderChangeAnnouncement(initialText: string) {
  return renderHook(({ text }: { text: string }) => useChangeAnnouncement(text), {
    initialProps: { text: initialText },
  });
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useChangeAnnouncement', () => {
  it('en iOS anuncia el texto solo cuando cambia y no al montar', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const announce = spyOnAnnouncements();
    const { rerender } = await renderChangeAnnouncement(FIRST_TEXT);

    expect(announce).not.toHaveBeenCalled();

    await rerender({ text: FIRST_TEXT });

    expect(announce).not.toHaveBeenCalled();

    await rerender({ text: SECOND_TEXT });

    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenLastCalledWith(SECOND_TEXT);

    await rerender({ text: SECOND_TEXT });

    expect(announce).toHaveBeenCalledTimes(1);
  });

  it('en Android no anuncia a mano', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const announce = spyOnAnnouncements();
    const { rerender } = await renderChangeAnnouncement(FIRST_TEXT);

    await rerender({ text: SECOND_TEXT });
    await rerender({ text: FIRST_TEXT });

    expect(announce).not.toHaveBeenCalled();
  });
});
