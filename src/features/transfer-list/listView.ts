import type { ListSnapshot, ListView } from './types';

type ListState = { data: ListSnapshot | undefined; error: unknown };

export function selectListView({ data, error }: ListState): ListView {
  if (data === undefined) return error !== null ? 'firstError' : 'skeleton';
  return data.transfers.length === 0 ? 'empty' : 'list';
}
