import { useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';

import { useHasSession } from '@/features/auth';

// Sin el dato que la pantalla necesita, la sustituye por otro destino. Sin sesión no hace nada:
// esa redirección, al login, ya la hace la guarda del navegador. Se usa el router del contexto
// porque al abrir la app desde un enlace el efecto corre antes de que el global esté listo.
export function useRedirectWhenMissing<T>(value: T | null, href: Href): void {
  const router = useRouter();
  const hasSession = useHasSession();
  const missing = value === null;

  useEffect(() => {
    if (missing && hasSession) router.replace(href);
  }, [router, missing, hasSession, href]);
}
