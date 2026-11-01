import type { Transfer } from '@/services/api/types';
import type { CalendarDate } from '@/utils/date';

export type AmountBounds = { min: number | null; max: number | null }; // centavos; null = sin límite
export type DateBounds = { from: CalendarDate | null; to: CalendarDate | null };
export type ListFilters = { query: string; amount: AmountBounds; dates: DateBounds };
export type ListSnapshot = { transfers: Transfer[]; today: CalendarDate };
export type IndexedTransfer = { transfer: Transfer; receivedIndex: number };
export type TransferRow = {
  key: string;
  name: string;
  detail: string;
  amount: string;
  scheduled: boolean;
  spokenLabel: string;
};
export type ListView = 'skeleton' | 'firstError' | 'empty' | 'list';
export type FilterSheet = 'amount' | 'date' | null;
export type BoundField = 'from' | 'to';
