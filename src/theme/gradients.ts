import { palette } from './colors';

type Point = { x: number; y: number };

export type Gradient = {
  colors: readonly [string, string, ...string[]];
  locations?: readonly [number, number, ...number[]];
  start: Point;
  end: Point;
};

export const gradients = {
  cta: {
    colors: [palette.mint, palette.sky],
    start: { x: 0, y: 0.5 },
    end: { x: 1, y: 0.5 },
  },
  accentSoft: {
    colors: [palette.aquaGreen, palette.aquaBlue],
    start: { x: 0, y: 0.53 },
    end: { x: 1, y: 0.47 },
  },
  brand: {
    colors: [palette.violet, palette.blueDeep],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  brandHero: {
    colors: [palette.violet, palette.blueDeep, palette.blueDeep],
    locations: [0.14, 0.56, 1],
    start: { x: 0.04, y: 0.7 },
    end: { x: 0.96, y: 0.3 },
  },
} as const satisfies Record<string, Gradient>;
