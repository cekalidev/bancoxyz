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

const SURFACE_RADIUS = 12;

async function renderSurface(radius?: number) {
  await render(<Skeleton width="40%" height={20} tone="surface" radius={radius} />);
}

function highlightStyle() {
  const layer = screen.root?.children[0];
  return typeof layer === 'string' ? undefined : StyleSheet.flatten(layer?.props.style);
}

// El tono de superficie en reposo: la base opaca y la capa de realce encima, transparente.
function expectSurfaceAtRest() {
  expect(blockStyle()).toMatchObject({
    width: '40%',
    height: 20,
    borderRadius: SURFACE_RADIUS,
    overflow: 'hidden',
    backgroundColor: colors.skeletonBase,
  });
  expect(blockStyle()).not.toHaveProperty('opacity');
  expect(highlightStyle()).toMatchObject({
    ...StyleSheet.flatten(StyleSheet.absoluteFill),
    backgroundColor: colors.skeletonHighlight,
    opacity: 0,
  });
}

async function setOpacityOf(value: unknown, opacity: number) {
  if (!(value instanceof Animated.Value)) throw new Error('El pulso no anima un Animated.Value');
  await act(async () => value.setValue(opacity));
}

it('el tono de superficie pulsa del color base al de realce y queda en el base con reducción de movimiento', async () => {
  mockReducedMotion(false);
  const timing = jest.spyOn(Animated, 'timing');
  const { start } = spyLoopStart();
  await renderSurface(SURFACE_RADIUS);

  expectSurfaceAtRest();
  const pulse = { duration: HALF_PULSE, useNativeDriver: true };
  expect(timing.mock.calls.map(([, config]) => config)).toEqual([
    expect.objectContaining({ ...pulse, toValue: 1 }),
    expect.objectContaining({ ...pulse, toValue: 0 }),
  ]);
  expect(start).toHaveBeenCalledTimes(1);
  await setOpacityOf(timing.mock.calls[0][0], 0.5);
  expect(highlightStyle()).toMatchObject({ opacity: 0.5 });
  expect(blockStyle()).not.toHaveProperty('opacity');

  await screen.unmount();
  start.mockClear();
  mockReducedMotion(true);
  await renderSurface(SURFACE_RADIUS);
  await act(async () => jest.advanceTimersByTime(motion.skeletonPulse));

  expectSurfaceAtRest();
  expect(start).not.toHaveBeenCalled();
});

it('el tono de superficie usa el radio de los esqueletos si no se indica otro', async () => {
  mockReducedMotion(true);
  await renderSurface();

  expect(blockStyle()).toMatchObject({ borderRadius: radii.skeleton });
});

it('el tono de superficie no anima mientras no sabe si hay reducción de movimiento', async () => {
  const preference = defer<boolean>();
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockReturnValue(preference.promise);
  const { start } = spyLoopStart();
  await renderSurface();

  await act(async () => jest.advanceTimersByTime(motion.skeletonPulse));

  expect(blockStyle()).toMatchObject({ backgroundColor: colors.skeletonBase });
  expect(highlightStyle()).toMatchObject({ opacity: 0 });
  expect(start).not.toHaveBeenCalled();
});
