import { render, renderHook } from '@testing-library/react-native';
import { createRef } from 'react';
import { AccessibilityInfo, View, type ViewInstance } from 'react-native';

import { useFocusOnNextFrame } from '@/components/useFocusOnNextFrame';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Nodos a los que se pidió el foco del lector de pantalla, en orden; falla si el evento no es `focus`.
function watchFocusRequests() {
  const sendEvent = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockImplementation();
  return () =>
    sendEvent.mock.calls.map(([node, type]) => {
      expect(type).toBe('focus');
      return node;
    });
}

async function renderNodes() {
  const first = createRef<ViewInstance>();
  const second = createRef<ViewInstance>();
  await render(
    <>
      <View ref={first} />
      <View ref={second} />
    </>,
  );
  return { first, second };
}

function advanceOneFrame() {
  jest.runOnlyPendingTimers();
}

it('pide el foco del lector en el siguiente fotograma y cancela el pendiente al pedir otro o al desmontar', async () => {
  const focusRequests = watchFocusRequests();
  const { first, second } = await renderNodes();
  const { result, unmount } = await renderHook(() => useFocusOnNextFrame());
  const focusLater = result.current;

  focusLater(first);
  expect(focusRequests()).toHaveLength(0);
  advanceOneFrame();
  expect(focusRequests()).toHaveLength(1);
  expect(focusRequests()[0]).toBe(first.current);

  focusLater(first);
  focusLater(second);
  advanceOneFrame();
  expect(focusRequests()).toHaveLength(2);
  expect(focusRequests()[1]).toBe(second.current);

  focusLater(createRef<ViewInstance>());
  advanceOneFrame();
  expect(focusRequests()).toHaveLength(2);

  focusLater(first);
  await unmount();
  advanceOneFrame();
  expect(focusRequests()).toHaveLength(2);
});
