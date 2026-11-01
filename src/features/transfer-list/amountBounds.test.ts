import {
  type AmountDraft,
  boundsFromTexts,
  changeBound,
  clearBound,
  draftFromBounds,
  rangeError,
  submitDraft,
  textsFromBounds,
} from './amountBounds';
import { append, CHANGE_CASES, deleteLast, type Edit } from './amountBounds.cases';
import type { AmountBounds, BoundField } from './types';

const RANGE_MESSAGE = '«Desde» no puede ser mayor que «Hasta».';

describe('rangeError', () => {
  it.each([
    { min: 200_001, max: 200_000, expected: RANGE_MESSAGE },
    { min: 400_000, max: 200_000, expected: RANGE_MESSAGE },
    { min: 200_000, max: 200_000, expected: null },
    { min: 200_000, max: 400_000, expected: null },
    { min: 400_000, max: null, expected: null },
    { min: null, max: 200_000, expected: null },
    { min: 0, max: 0, expected: null },
    { min: 0, max: null, expected: null },
    { min: null, max: 0, expected: null },
    { min: null, max: null, expected: null },
  ])('solo hay error si Desde es mayor que Hasta', ({ min, max, expected }) => {
    expect(rangeError({ min, max })).toBe(expected);
  });

  it('Desde 0,01 y Hasta 0,00 es un error', () => {
    expect(rangeError({ min: 1, max: 0 })).toBe(RANGE_MESSAGE);
  });
});

type Texts = Record<BoundField, string>;

describe('boundsFromTexts y textsFromBounds', () => {
  it.each<{ texts: Texts; bounds: AmountBounds }>([
    { texts: { from: '0,00', to: '' }, bounds: { min: 0, max: null } },
    { texts: { from: '', to: '0,00' }, bounds: { min: null, max: 0 } },
    { texts: { from: '0,00', to: '0,00' }, bounds: { min: 0, max: 0 } },
    { texts: { from: '', to: '' }, bounds: { min: null, max: null } },
  ])('cero es un límite y no equivale a vacío', ({ texts, bounds }) => {
    expect(boundsFromTexts(texts)).toEqual(bounds);
    expect(textsFromBounds(bounds)).toEqual(texts);
  });

  it.each<{ texts: Texts; bounds: AmountBounds }>([
    { texts: { from: '0,01', to: '1.250,00' }, bounds: { min: 1, max: 125_000 } },
    { texts: { from: '12,34', to: '1.000.000,00' }, bounds: { min: 1_234, max: 100_000_000 } },
    { texts: { from: '', to: '9.999.999.999,99' }, bounds: { min: null, max: 999_999_999_999 } },
    { texts: { from: '2.000,00', to: '' }, bounds: { min: 200_000, max: null } },
  ])(
    'el texto de cada extremo se convierte a centavos y de vuelta con el formato pt-BR',
    ({ texts, bounds }) => {
      expect(boundsFromTexts(texts)).toEqual(bounds);
      expect(textsFromBounds(bounds)).toEqual(texts);
    },
  );
});

describe('draftFromBounds', () => {
  it.each<{ applied: AmountBounds; texts: Texts }>([
    { applied: { min: null, max: null }, texts: { from: '', to: '' } },
    { applied: { min: 125_000, max: null }, texts: { from: '1.250,00', to: '' } },
    { applied: { min: null, max: 400_000 }, texts: { from: '', to: '4.000,00' } },
    { applied: { min: 0, max: 0 }, texts: { from: '0,00', to: '0,00' } },
    { applied: { min: 1, max: 200_000 }, texts: { from: '0,01', to: '2.000,00' } },
  ])(
    'el borrador parte del filtro aplicado o vacío, sin error ni Aplicar pulsado',
    ({ applied, texts }) => {
      expect(draftFromBounds(applied)).toEqual({ texts, submitted: false, error: null });
    },
  );
});

describe('changeBound', () => {
  it.each(CHANGE_CASES)(
    'escribir en un extremo aplica la máscara de centavos del campo valor',
    ({ field, initial, edits, expected }) => {
      const start: AmountDraft = { texts: initial, submitted: false, error: null };

      const result = edits.reduce(
        (draft, edit) => changeBound(draft, field, edit(draft.texts[field])),
        start,
      );

      expect(result).toEqual({ texts: expected, submitted: false, error: null });
    },
  );
});

type Change = { field: BoundField; edit: Edit };
type Revalidation = { start: Texts; breakIt: Change; fixIt: Change };

const change = (draft: AmountDraft, { field, edit }: Change): AmountDraft =>
  changeBound(draft, field, edit(draft.texts[field]));
const emptied: Edit = () => '';

const REVALIDATION_CASES: Revalidation[] = [
  {
    start: { from: '2.000,00', to: '4.000,00' },
    breakIt: { field: 'to', edit: deleteLast },
    fixIt: { field: 'to', edit: append('0') },
  },
  {
    start: { from: '2.000,00', to: '2.000,00' },
    breakIt: { field: 'from', edit: append('1') },
    fixIt: { field: 'from', edit: deleteLast },
  },
  {
    start: { from: '', to: '2.000,00' },
    breakIt: { field: 'from', edit: append('400001') },
    fixIt: { field: 'from', edit: emptied },
  },
  {
    start: { from: '4.000,00', to: '' },
    breakIt: { field: 'to', edit: append('2000') },
    fixIt: { field: 'to', edit: emptied },
  },
  {
    start: { from: '0,00', to: '0,00' },
    breakIt: { field: 'from', edit: append('1') },
    fixIt: { field: 'to', edit: append('1') },
  },
];

const SUBMIT_CASES: { texts: Texts; bounds: AmountBounds }[] = [
  { texts: { from: '2.000,00', to: '2.000,00' }, bounds: { min: 200_000, max: 200_000 } },
  { texts: { from: '2.000,00', to: '4.000,00' }, bounds: { min: 200_000, max: 400_000 } },
  { texts: { from: '4.000,00', to: '' }, bounds: { min: 400_000, max: null } },
  { texts: { from: '', to: '2.000,00' }, bounds: { min: null, max: 200_000 } },
  { texts: { from: '0,00', to: '' }, bounds: { min: 0, max: null } },
  { texts: { from: '', to: '0,00' }, bounds: { min: null, max: 0 } },
  { texts: { from: '0,00', to: '0,00' }, bounds: { min: 0, max: 0 } },
  { texts: { from: '', to: '' }, bounds: { min: null, max: null } },
];

describe('submitDraft', () => {
  it.each(REVALIDATION_CASES)(
    'el error solo aparece tras el primer Aplicar y después se revalida en cada cambio',
    ({ start, breakIt, fixIt }) => {
      const typed = change({ texts: start, submitted: false, error: null }, breakIt);
      expect(typed).toMatchObject({ submitted: false, error: null });

      const pressed = submitDraft(typed);
      expect(pressed).toEqual({
        draft: { texts: typed.texts, submitted: true, error: RANGE_MESSAGE },
        bounds: null,
      });

      const fixed = change(pressed.draft, fixIt);
      expect(fixed).toMatchObject({ submitted: true, error: null });
      expect(change(fixed, breakIt)).toMatchObject({ submitted: true, error: RANGE_MESSAGE });
    },
  );

  it.each(SUBMIT_CASES)(
    'Aplicar sin error devuelve los límites en centavos, también 0, y con los dos extremos vacíos no hay límites',
    ({ texts, bounds }) => {
      expect(submitDraft({ texts, submitted: false, error: null })).toEqual({
        draft: { texts, submitted: true, error: null },
        bounds,
      });
    },
  );
});

type Clearing = { before: AmountDraft; field: BoundField; after: AmountDraft };

const draftOf = (texts: Texts, submitted: boolean, error: string | null): AmountDraft => ({
  texts,
  submitted,
  error,
});

const CLEAR_CASES: Clearing[] = [
  {
    before: draftOf({ from: '2.000,00', to: '4.000,00' }, false, null),
    field: 'from',
    after: draftOf({ from: '', to: '4.000,00' }, false, null),
  },
  {
    before: draftOf({ from: '2.000,00', to: '4.000,00' }, false, null),
    field: 'to',
    after: draftOf({ from: '2.000,00', to: '' }, false, null),
  },
  {
    before: draftOf({ from: '0,00', to: '0,00' }, false, null),
    field: 'from',
    after: draftOf({ from: '', to: '0,00' }, false, null),
  },
  {
    before: draftOf({ from: '0,00', to: '0,00' }, false, null),
    field: 'to',
    after: draftOf({ from: '0,00', to: '' }, false, null),
  },
  {
    before: draftOf({ from: '', to: '4.000,00' }, false, null),
    field: 'from',
    after: draftOf({ from: '', to: '4.000,00' }, false, null),
  },
  {
    before: draftOf({ from: '2.000,00', to: '4.000,00' }, true, null),
    field: 'to',
    after: draftOf({ from: '2.000,00', to: '' }, true, null),
  },
  {
    before: draftOf({ from: '4.000,00', to: '2.000,00' }, true, RANGE_MESSAGE),
    field: 'from',
    after: draftOf({ from: '', to: '2.000,00' }, true, null),
  },
  {
    before: draftOf({ from: '4.000,00', to: '2.000,00' }, true, RANGE_MESSAGE),
    field: 'to',
    after: draftOf({ from: '4.000,00', to: '' }, true, null),
  },
  {
    before: draftOf({ from: '0,01', to: '0,00' }, true, RANGE_MESSAGE),
    field: 'to',
    after: draftOf({ from: '0,01', to: '' }, true, null),
  },
];

describe('clearBound', () => {
  it.each(CLEAR_CASES)(
    'borrar un extremo lo vacía, no toca el otro y revalida si ya se pulsó Aplicar',
    ({ before, field, after }) => {
      expect(clearBound(before, field)).toEqual(after);
    },
  );
});
