// Primero la librería de testing, para que su limpieza automática se registre
// antes que los afterEach de este archivo y estos corran con todo desmontado.
import { configure } from '@testing-library/react-native';
import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';

import { settlePendingFetches } from './fetchPending';
import { resetSecureStore } from './secureStoreMock';

// Margen para findBy/waitFor cuando la máquina va cargada.
configure({ asyncUtilTimeout: 5000 });

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hide: jest.fn(),
}));

jest.mock('expo-secure-store', () => jest.requireActual('./secureStoreMock').secureStoreModule);

beforeEach(resetSecureStore);

// Rechaza los fetch que un test dejó sin responder, para que no queden timers vivos.
afterEach(settlePendingFetches);
