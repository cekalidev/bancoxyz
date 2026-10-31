import { Screen } from '@/components/Screen';
import { useUserName } from '@/features/auth';

import { BalanceSection } from '../components/BalanceSection';
import { Greeting } from '../components/Greeting';
import { HomeActions } from '../components/HomeActions';
import { useBalance } from '../useBalance';
import { useBalanceVisibility } from '../useBalanceVisibility';

// El orden de los bloques es también el orden de lectura.
export function HomeScreen() {
  const name = useUserName();
  const balance = useBalance();
  const visibility = useBalanceVisibility();

  return (
    <Screen scroll>
      <Greeting name={name} />
      <BalanceSection balance={balance} visibility={visibility} />
      <HomeActions />
    </Screen>
  );
}
