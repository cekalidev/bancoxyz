/** @jest-environment node */
import { expectLayerMessage, findLayerMessages, importOf } from '../test/lintHelpers';

const routePath = 'src/app/example.tsx';

describe('capa app', () => {
  it('una ruta que importa algo distinto del índice de una funcionalidad se rechaza con un mensaje que nombra la capa app y la funcionalidad', async () => {
    const sources = ['react-native', '@/components/x', '@/features/home/screens', 'expo-router'];

    for (const source of sources) {
      const messages = await findLayerMessages(`export { default } from '${source}';\n`, routePath);

      expectLayerMessage(messages, 'app', 'funcionalidad');
      expect(messages.every(({ message }) => message.includes('reexportan'))).toBe(true);
    }
    const router = "import { Stack } from 'expo-router';\n\nexport default Stack;\n";
    expectLayerMessage(await findLayerMessages(router, routePath), 'app', 'funcionalidad');
  });

  it('una ruta que reexporta el índice de una funcionalidad se permite', async () => {
    const code = "export { HomeScreen as default } from '@/features/home';\n";

    expect(await findLayerMessages(code, routePath)).toEqual([]);
  });
});

describe('capa features', () => {
  const featurePath = 'src/features/transfer-list/Example.tsx';

  it('una funcionalidad que importa un archivo interno de otra se rechaza con un mensaje que nombra las dos', async () => {
    const messages = await findLayerMessages(importOf('@/features/home/greeting'), featurePath);

    expectLayerMessage(messages, 'features/transfer-list', 'features/home');
  });

  it('una funcionalidad puede importar el índice de otra, sus propios archivos y las capas compartidas', async () => {
    const sources = [
      '@/features/home',
      './listText',
      '@/features/transfer-list/types',
      '@/components/Button',
      '@/hooks/useAsync',
      '@/services/api/types',
      '@/utils/date',
      '@/theme',
    ];

    for (const source of sources) {
      expect(await findLayerMessages(importOf(source), featurePath)).toEqual([]);
    }
  });

  it('una funcionalidad que importa de app o de las utilidades de test se rechaza', async () => {
    const cases = [
      { source: '@/app/index', destination: 'app' },
      { source: '@/test/fetchMock', destination: 'test' },
    ];

    for (const { source, destination } of cases) {
      const messages = await findLayerMessages(importOf(source), featurePath);

      expectLayerMessage(messages, 'features/transfer-list', destination);
    }
  });
});

describe('capa services/api', () => {
  const apiPath = 'src/services/api/example.ts';
  const forbidden = [
    ['react', 'react'],
    ['react-native', 'react-native'],
    ['zustand', 'zustand'],
    ['expo-secure-store', 'expo'],
    ['@/features/home', 'features'],
    ['@/components/Button', 'components'],
    ['@/hooks/useAsync', 'hooks'],
    ['@/theme', 'theme'],
    ['@/app/index', 'app'],
    ['@/test/fetchMock', 'test'],
    ['@/services/storage/sessionStorage', 'services/storage'],
  ];

  it.each(forbidden)(
    'el cliente de la API que importa React, React Native, un store, Expo, una funcionalidad, componentes, hooks, el tema, app, las utilidades de test o el almacenamiento se rechaza con un mensaje que nombra las dos capas (%s)',
    async (source, destination) => {
      expectLayerMessage(await findLayerMessages(importOf(source), apiPath), 'services/api', destination);
    },
  );

  it('el cliente de la API puede importar utilidades y sus propios archivos', async () => {
    for (const source of ['@/utils/date', './client', '@/services/api/types']) {
      expect(await findLayerMessages(importOf(source), apiPath)).toEqual([]);
    }
  });
});

describe('capa services/storage', () => {
  const storagePath = 'src/services/storage/example.ts';
  const forbidden = [
    ['@/services/api/client', 'services/api'],
    ['@/features/home', 'features'],
    ['@/components/Button', 'components'],
    ['@/hooks/useAsync', 'hooks'],
    ['@/theme', 'theme'],
    ['@/app/index', 'app'],
    ['@/test/fetchMock', 'test'],
    ['react', 'react'],
    ['react-native', 'react-native'],
    ['zustand', 'zustand'],
  ];

  it.each(forbidden)(
    'el almacenamiento que importa el cliente de la API (salvo sus tipos y guardas), una funcionalidad, componentes, hooks, el tema, app, test, React o un store se rechaza con un mensaje que nombra las dos capas (%s)',
    async (source, destination) => {
      const messages = await findLayerMessages(importOf(source), storagePath);

      expectLayerMessage(messages, 'services/storage', destination);
    },
  );

  it('el almacenamiento puede importar utilidades, los tipos y las guardas del cliente de la API y el almacén seguro de Expo', async () => {
    const sources = ['@/utils/date', '@/services/api/types', '@/services/api/guards', 'expo-secure-store', './storedSession'];

    for (const source of sources) {
      expect(await findLayerMessages(importOf(source), storagePath)).toEqual([]);
    }
  });
});

describe('capa components', () => {
  const componentPath = 'src/components/Example.tsx';
  const forbidden = [
    ['@/features/home', 'features'],
    ['@/services/api/types', 'services'],
    ['@/hooks/useAsync', 'hooks'],
    ['@/app/index', 'app'],
    ['@/test/fetchMock', 'test'],
  ];

  it.each(forbidden)(
    'un componente base que importa una funcionalidad, un servicio, los hooks genéricos, app o las utilidades de test se rechaza con un mensaje que nombra las dos capas (%s)',
    async (source, destination) => {
      const messages = await findLayerMessages(importOf(source), componentPath);

      expectLayerMessage(messages, 'components', destination);
    },
  );

  it('un componente base puede importar componentes, el tema, utilidades y paquetes de interfaz', async () => {
    const sources = ['@/components/Button', './useReducedMotion', '@/theme', '@/utils/date', 'react-native', 'react-native-svg'];

    for (const source of sources) {
      expect(await findLayerMessages(importOf(source), componentPath)).toEqual([]);
    }
  });
});
