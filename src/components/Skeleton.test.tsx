import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, StyleSheet } from 'react-native';

import { Skeleton } from '@/components/Skeleton';
import { defer } from '@/test/defer';
import { mockReducedMotion } from '@/test/reducedMotion';
import { colors, motion, radii } from '@/theme';

const HALF_PULSE = motion.skeletonPulse / 2;

function blockStyle() {
  return StyleSheet.flatten(screen.root?.props.style);
}

function spyLoopStart() {
  const start = jest.fn();
  const loop = jest.spyOn(Animated, 'loop').mockImplementation(
    () => ({ start, stop: jest.fn(), reset: jest.fn() }) as unknown as Animated.CompositeAnimation,
  );
  return { loop, start };
}

async function renderSkeleton() {
  await render(<Skeleton width="60%" height={24} tone="onBrand" />);
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Con el driver nativo la opacidad se anima fuera de JS: se comprueba el pulso que se entrega y su arranque.
it('pulsa la opacidad mientras se muestra', async () => {
  mockReducedMotion(false);
  const timing = jest.spyOn(Animated, 'timing');
  const { start } = spyLoopStart();
  await renderSkeleton();

  expect(blockStyle()).toMatchObject({
    width: '60%',
    height: 24,
    borderRadius: radii.skeleton,
    backgroundColor: colors.skeletonOnBrand,
    opacity: 1,
  });
  const pulse = { duration: HALF_PULSE, useNativeDriver: true };
  expect(timing.mock.calls.map(([, config]) => config)).toEqual([
    expect.objectContaining({ ...pulse, toValue: motion.skeletonMinOpacity }),
    expect.objectContaining({ ...pulse, toValue: 1 }),
  ]);
  expect(start).toHaveBeenCalledTimes(1);
});

it('con reducción de movimiento queda estático y no arranca la animación', async () => {
  mockReducedMotion(true);
  const { start } = spyLoopStart();
  await renderSkeleton();

  await act(async () => jest.advanceTimersByTime(motion.skeletonPulse));

  expect(blockStyle()).toMatchObject({
    backgroundColor: colors.skeletonOnBrand,
    opacity: 1,
  });
  expect(start).not.toHaveBeenCalled();
});

it('no anima mientras no sabe si hay reducción de movimiento', async () => {
  const preference = defer<boolean>();
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockReturnValue(preference.promise);
  const { start } = spyLoopStart();
  await renderSkeleton();

  await act(async () => jest.advanceTimersByTime(motion.skeletonPulse));

  expect(blockStyle()).toMatchObject({
    backgroundColor: colors.skeletonOnBrand,
    opacity: 1,
  });
  expect(start).not.toHaveBeenCalled();
});
