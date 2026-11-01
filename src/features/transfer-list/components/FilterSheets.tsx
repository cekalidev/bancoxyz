import type { ListFiltersControls } from '../useListFilters';
import { AmountFilterSheet } from './AmountFilterSheet';
import { DateFilterSheet } from './DateFilterSheet';

type FilterSheetsProps = { filters: ListFiltersControls; currency: string | null };

// La hoja abierta, si la hay: cada una se monta solo mientras está abierta.
export function FilterSheets({ filters, currency }: FilterSheetsProps) {
  if (filters.openSheet === 'amount') {
    return (
      <AmountFilterSheet
        applied={filters.filters.amount}
        currency={currency}
        onApply={filters.applyAmount}
        onRemove={filters.removeAmount}
        onClose={filters.close}
      />
    );
  }
  if (filters.openSheet === 'date') {
    return (
      <DateFilterSheet
        applied={filters.filters.dates}
        onApply={filters.applyDates}
        onRemove={filters.removeDates}
        onClose={filters.close}
      />
    );
  }

  return null;
}
