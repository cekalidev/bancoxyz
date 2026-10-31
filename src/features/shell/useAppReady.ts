import { useSessionRestore } from '@/features/auth';

import { useAppFonts } from './useAppFonts';

export function useAppReady(): boolean {
  const [loaded, error] = useAppFonts();
  const sessionRestored = useSessionRestore();
  const fontsDone = loaded || error !== null;
  return fontsDone && sessionRestored;
}
