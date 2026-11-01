import { Banner } from '@/components/Banner';
import { Screen } from '@/components/Screen';

import { RefreshBanner } from '../components/ListTop';
import { NoTransfers } from '../components/NoTransfers';
import { TransferListBody } from '../components/TransferListBody';
import { TransfersSkeleton } from '../components/TransfersSkeleton';
import { useCloseSheetWhenEmpty } from '../useCloseSheetWhenEmpty';
import { useListFilters } from '../useListFilters';
import { useTransferList } from '../useTransferList';

export function TransferListScreen() {
  const list = useTransferList();
  const filters = useListFilters();
  useCloseSheetWhenEmpty(list.view, filters);

  if (list.view === 'list' && list.snapshot !== undefined) {
    return <TransferListBody snapshot={list.snapshot} filters={filters} notice={list} />;
  }

  if (list.view === 'empty') {
    return (
      <Screen scroll>
        <RefreshBanner notice={list} />
        <NoTransfers titleRef={filters.emptyTitleRef} />
      </Screen>
    );
  }

  if (list.view !== 'skeleton' && list.view !== 'firstError') return null;

  // El aviso queda siempre montado para que su región exista antes de que aparezca el error.
  return (
    <Screen scroll>
      <Banner
        variant="error"
        message={list.message}
        announceKey={list.errorId}
        action={{
          label: 'Reintentar',
          busyLabel: 'Reintentando…',
          onPress: list.retry,
          busy: list.retrying,
          align: 'center',
        }}
      />
      {list.view === 'skeleton' ? <TransfersSkeleton /> : null}
    </Screen>
  );
}
