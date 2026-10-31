import { Button } from '@/components/Button';

import { confirmLogout } from '../confirmLogout';

export function LogoutButton() {
  return (
    <Button variant="ghost" label="Salir" accessibilityLabel="Cerrar sesión" onPress={confirmLogout} />
  );
}
