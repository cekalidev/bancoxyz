import type { BoundField } from './types';

type Texts = Record<BoundField, string>;

export type Edit = (text: string) => string;

export const append =
  (chars: string): Edit =>
  (text) =>
    text + chars;
export const deleteLast: Edit = (text) => text.slice(0, -1);
export const typeKeys = (keys: string): Edit[] => [...keys].map(append);

export type ChangeCase = { field: BoundField; initial: Texts; edits: Edit[]; expected: Texts };

export const CHANGE_CASES: ChangeCase[] = [
  {
    field: 'from',
    initial: { from: '', to: '' },
    edits: typeKeys('125000'),
    expected: { from: '1.250,00', to: '' },
  },
  {
    field: 'to',
    initial: { from: '2.000,00', to: '' },
    edits: typeKeys('125000'),
    expected: { from: '2.000,00', to: '1.250,00' },
  },
  {
    field: 'from',
    initial: { from: '', to: '4.000,00' },
    edits: [append('1.250,00')],
    expected: { from: '1.250,00', to: '4.000,00' },
  },
  {
    field: 'to',
    initial: { from: '', to: '' },
    edits: [append('1250')],
    expected: { from: '', to: '12,50' },
  },
  {
    field: 'from',
    initial: { from: '', to: '' },
    edits: [append('R$ 12,5x')],
    expected: { from: '1,25', to: '' },
  },
  {
    field: 'from',
    initial: { from: '9.999.999.999,99', to: '' },
    edits: [append('1')],
    expected: { from: '9.999.999.999,99', to: '' },
  },
  {
    field: 'to',
    initial: { from: '', to: '' },
    edits: [append('1234567890123')],
    expected: { from: '', to: '1.234.567.890,12' },
  },
  {
    field: 'from',
    initial: { from: '', to: '' },
    edits: [append('999999999999')],
    expected: { from: '9.999.999.999,99', to: '' },
  },
  {
    field: 'from',
    initial: { from: '1,25', to: '' },
    edits: [append('a')],
    expected: { from: '1,25', to: '' },
  },
  {
    field: 'to',
    initial: { from: '', to: '' },
    edits: [append('abc')],
    expected: { from: '', to: '' },
  },
  {
    field: 'from',
    initial: { from: '', to: '3,00' },
    edits: [append('0')],
    expected: { from: '0,00', to: '3,00' },
  },
  {
    field: 'from',
    initial: { from: '1,25', to: '' },
    edits: [deleteLast],
    expected: { from: '0,12', to: '' },
  },
  {
    field: 'from',
    initial: { from: '0,01', to: '4.000,00' },
    edits: [deleteLast],
    expected: { from: '', to: '4.000,00' },
  },
  {
    field: 'to',
    initial: { from: '', to: '0,00' },
    edits: [deleteLast],
    expected: { from: '', to: '' },
  },
  {
    field: 'to',
    initial: { from: '', to: '0,12' },
    edits: [deleteLast, deleteLast, deleteLast],
    expected: { from: '', to: '' },
  },
];
