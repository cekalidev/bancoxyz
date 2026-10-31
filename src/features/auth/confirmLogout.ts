import { Alert } from 'react-native';

import { signOut } from './sessionActions';

export function confirmLogout(): void {
  Alert.alert(
    '¿Cerrar sesión?',
    undefined,
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: signOut },
    ],
    // On Android dialogs are not cancelable by default.
    { cancelable: true },
  );
}
