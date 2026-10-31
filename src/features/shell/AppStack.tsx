import { Stack } from 'expo-router';

import { AppHeader } from '@/components/AppHeader';
import { LogoutButton, useHasSession } from '@/features/auth';
import { colors } from '@/theme';

// Tipado estructural: solo se usa `goBack` de la navegación que recibe la cabecera.
type BackHeaderProps = { navigation: { goBack: () => void } };

const renderHeader = () => <AppHeader />;
const renderHomeHeader = () => <AppHeader right={<LogoutButton />} />;

function renderNewTransferHeader({ navigation }: BackHeaderProps) {
  return <AppHeader title="Nueva transferencia" onBack={() => navigation.goBack()} />;
}

function renderTransfersHeader({ navigation }: BackHeaderProps) {
  return <AppHeader title="Transferencias" onBack={() => navigation.goBack()} />;
}

export function AppStack() {
  const hasSession = useHasSession();

  return (
    <Stack
      screenOptions={{
        header: renderHeader,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={hasSession} redirectTo="/login">
        <Stack.Screen name="index" options={{ header: renderHomeHeader }} />
        <Stack.Screen name="nueva-transferencia" options={{ header: renderNewTransferHeader }} />
        <Stack.Screen name="transferencias" options={{ header: renderTransfersHeader }} />
      </Stack.Protected>
      <Stack.Protected guard={!hasSession} redirectTo="/">
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
