import { useEffect, useState } from 'react';

import { restoreSession } from './restoreSession';

export function useSessionRestore(): boolean {
  const [done, setDone] = useState(false);

  useEffect(() => {
    void restoreSession().then(() => setDone(true));
  }, []);

  return done;
}
