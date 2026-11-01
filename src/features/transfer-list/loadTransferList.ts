import { getTransfers } from '@/services/api/transfers';
import { todayLocal } from '@/utils/date';

import type { ListSnapshot } from './types';

// El «hoy» se toma al llegar cada respuesta: una recarga después de medianoche usa el día nuevo.
export async function loadTransferList(): Promise<ListSnapshot> {
  return { transfers: await getTransfers(), today: todayLocal() };
}
