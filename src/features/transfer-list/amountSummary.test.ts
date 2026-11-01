import { amountChipLabel, amountChipText } from './amountSummary';
import type { AmountBounds } from './types';

const NBSP = ' ';
const DASH = '–';
const NONE: AmountBounds = { min: null, max: null };

const DEFAULT_CURRENCY = 'USD';

type Row = { bounds: AmountBounds; currency?: string; chip: string; label: string };

const ROWS: Row[] = [
  { bounds: NONE, chip: 'Valor', label: 'Filtro de valor: sin aplicar' },
  {
    bounds: { min: 200_000, max: 400_000 },
    chip: `US$${NBSP}2.000${DASH}4.000`,
    label: 'Filtro de valor: de 2.000 a 4.000 dólares',
  },
  {
    bounds: { min: 200_050, max: 400_000 },
    chip: `US$${NBSP}2.000,50${DASH}4.000`,
    label: 'Filtro de valor: de 2.000,50 a 4.000 dólares',
  },
  {
    bounds: { min: 200_000, max: 400_005 },
    chip: `US$${NBSP}2.000${DASH}4.000,05`,
    label: 'Filtro de valor: de 2.000 a 4.000,05 dólares',
  },
  {
    bounds: { min: 100_000, max: 100_000 },
    chip: `US$${NBSP}1.000${DASH}1.000`,
    label: 'Filtro de valor: de 1.000 a 1.000 dólares',
  },
  {
    bounds: { min: 1, max: 100 },
    chip: `US$${NBSP}0,01${DASH}1`,
    label: 'Filtro de valor: de 0,01 a 1 dólar',
  },
  {
    bounds: { min: 100, max: 200_000 },
    chip: `US$${NBSP}1${DASH}2.000`,
    label: 'Filtro de valor: de 1 a 2.000 dólares',
  },
  {
    bounds: { min: 100, max: 100 },
    chip: `US$${NBSP}1${DASH}1`,
    label: 'Filtro de valor: de 1 a 1 dólar',
  },
  {
    bounds: { min: 200_000, max: null },
    chip: `Desde US$${NBSP}2.000`,
    label: 'Filtro de valor: desde 2.000 dólares',
  },
  {
    bounds: { min: 1, max: null },
    chip: `Desde US$${NBSP}0,01`,
    label: 'Filtro de valor: desde 0,01 dólares',
  },
  {
    bounds: { min: 100, max: null },
    chip: `Desde US$${NBSP}1`,
    label: 'Filtro de valor: desde 1 dólar',
  },
  {
    bounds: { min: null, max: 100 },
    chip: `Hasta US$${NBSP}1`,
    label: 'Filtro de valor: hasta 1 dólar',
  },
  {
    bounds: { min: 0, max: null },
    chip: `Desde US$${NBSP}0`,
    label: 'Filtro de valor: desde 0 dólares',
  },
  {
    bounds: { min: null, max: 400_000 },
    chip: `Hasta US$${NBSP}4.000`,
    label: 'Filtro de valor: hasta 4.000 dólares',
  },
  {
    bounds: { min: null, max: 99_999 },
    chip: `Hasta US$${NBSP}999,99`,
    label: 'Filtro de valor: hasta 999,99 dólares',
  },
  {
    bounds: { min: 50_000, max: null },
    currency: 'BRL',
    chip: `Desde R$${NBSP}500`,
    label: 'Filtro de valor: desde 500 reales',
  },
  {
    bounds: { min: null, max: 100 },
    currency: 'BRL',
    chip: `Hasta R$${NBSP}1`,
    label: 'Filtro de valor: hasta 1 real',
  },
];

it.each(
  ROWS.map(({ bounds, currency = DEFAULT_CURRENCY, chip }) => [bounds, currency, chip] as const),
)('el chip de valor resume el rango con céntimos solo si los hay', (bounds, currency, expected) => {
  expect(amountChipText(bounds, currency)).toBe(expected);
});

it.each(
  ROWS.map(({ bounds, currency = DEFAULT_CURRENCY, label }) => [bounds, currency, label] as const),
)(
  'la etiqueta del valor lo lee corto con la moneda al final y en singular ante 1',
  (bounds, currency, expected) => {
    expect(amountChipLabel(bounds, currency)).toBe(expected);
  },
);

it.each([
  [{ min: 100_000, max: null }, 'Desde 1.000', 'Filtro de valor: desde 1.000'],
  [{ min: 200_000, max: 400_000 }, `2.000${DASH}4.000`, 'Filtro de valor: de 2.000 a 4.000'],
  [{ min: null, max: 50_050 }, 'Hasta 500,50', 'Filtro de valor: hasta 500,50'],
  [NONE, 'Valor', 'Filtro de valor: sin aplicar'],
])('con varias monedas el chip y su etiqueta llevan solo números', (bounds, chip, label) => {
  expect(amountChipText(bounds, null)).toBe(chip);
  expect(amountChipLabel(bounds, null)).toBe(label);
});
