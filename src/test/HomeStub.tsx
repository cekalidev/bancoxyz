import { Text } from 'react-native';

export const HOME_STUB_TITLE = 'Inicio de prueba';

// Inicio de prueba sin red: sirve de marcador sin pedir el saldo al montarse.
export function HomeStub() {
  return <Text>{HOME_STUB_TITLE}</Text>;
}
