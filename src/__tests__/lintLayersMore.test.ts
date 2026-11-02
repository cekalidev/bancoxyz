/** @jest-environment node */
import { expectLayerMessage, findLayerMessages, importOf } from '../test/lintHelpers';

describe('capa hooks', () => {
  const hookPath = 'src/hooks/useExample.ts';
  const forbidden = [
    ['@/features/home', 'features'],
    ['@/services/api/types', 'services'],
    ['@/components/Button', 'components'],
    ['@/theme', 'theme'],
    ['@/app/index', 'app'],
    ['@/test/fetchMock', 'test'],
  ];

  it.each(forbidden)(
    'un hook genérico que importa una funcionalidad, un servicio, componentes, el tema, app o las utilidades de test se rechaza con un mensaje que nombra las dos capas (%s)',
    async (source, destination) => {
      expectLayerMessage(await findLayerMessages(importOf(source), hookPath), 'hooks', destination);
    },
  );

  it('un hook genérico puede importar hooks, utilidades, React, React Native y el enrutador', async () => {
    const sources = ['@/hooks/useAsync', './useAsync', '@/utils/date', 'react', 'react-native', 'expo-router'];

    for (const source of sources) {
      expect(await findLayerMessages(importOf(source), hookPath)).toEqual([]);
    }
  });
});

const utilPath = 'src/utils/example.ts';
const pureFilePaths = ['src/features/transfers/validateExample.ts', 'src/features/transfer-list/filterExample.ts'];
const forbiddenInUtils = [
  ['react', 'react'],
  ['react-native', 'react-native'],
  ['zustand', 'zustand'],
  ['expo-router', 'expo'],
  ['@/features/home', 'features'],
  ['@/services/api/types', 'services'],
  ['@/components/Button', 'components'],
  ['@/hooks/useAsync', 'hooks'],
  ['@/theme', 'theme'],
  ['@/app/index', 'app'],
  ['@/test/fetchMock', 'test'],
];

const forbiddenInPureFiles = [
  ['react', 'react'],
  ['react-native', 'react-native'],
  ['zustand', 'zustand'],
  ['expo-router', 'expo'],
  ['@/services/api/client', 'services'],
  ['@/components/Button', 'components'],
  ['@/hooks/useAsync', 'hooks'],
  ['@/app/index', 'app'],
  ['@/theme', 'theme'],
];

describe('capa utils y validadores puros', () => {
  it.each(forbiddenInUtils)(
    'una utilidad o un validador puro que importa React, React Native, un store, Expo u otra capa se rechaza con un mensaje que nombra las dos capas (utilidad que importa %s)',
    async (source, destination) => {
      expectLayerMessage(await findLayerMessages(importOf(source), utilPath), 'utils', destination);
    },
  );

  it.each(forbiddenInPureFiles)(
    'una utilidad o un validador puro que importa React, React Native, un store, Expo u otra capa se rechaza con un mensaje que nombra las dos capas (validador que importa %s)',
    async (source, destination) => {
      for (const filePath of pureFilePaths) {
        expectLayerMessage(await findLayerMessages(importOf(source), filePath), 'validateX/filterX', destination);
      }
    },
  );

  it('una utilidad o un validador puro puede importar utilidades y el validador también los tipos de dominio de la API', async () => {
    for (const source of ['@/utils/money', './money']) {
      expect(await findLayerMessages(importOf(source), utilPath)).toEqual([]);
    }
    for (const filePath of pureFilePaths) {
      for (const source of ['@/utils/date', '@/services/api/types']) {
        expect(await findLayerMessages(importOf(source), filePath)).toEqual([]);
      }
    }
  });
});

describe('capa theme', () => {
  const themePath = 'src/theme/example.ts';
  const outsideTheme = [
    ['src/features/home/Example.tsx', 'features'],
    ['src/components/Example.tsx', 'components'],
    ['src/hooks/useExample.ts', 'hooks'],
    ['src/utils/example.ts', 'utils'],
    ['src/services/api/example.ts', 'services/api'],
  ];
  const themeImports = [
    ['@/features/home', 'features'],
    ['@/services/api/types', 'services'],
    ['@/components/Button', 'components'],
    ['@/hooks/useAsync', 'hooks'],
    ['@/utils/date', 'utils'],
    ['@/app/index', 'app'],
    ['@/test/fetchMock', 'test'],
  ];

  it('importar un archivo interno del tema desde fuera se rechaza y el tema que importa otra capa también, con un mensaje que nombra las dos', async () => {
    for (const [filePath, origin] of outsideTheme) {
      expectLayerMessage(await findLayerMessages(importOf('@/theme/colors'), filePath), origin, 'theme');
    }
    for (const [source, destination] of themeImports) {
      expectLayerMessage(await findLayerMessages(importOf(source), themePath), 'theme', destination);
    }
  });

  it('el resto de capas puede importar el índice del tema y el tema puede importar sus propios archivos', async () => {
    for (const [filePath] of outsideTheme.slice(0, 2)) {
      expect(await findLayerMessages(importOf('@/theme'), filePath)).toEqual([]);
    }
    for (const source of ['./colors', '@/theme/spacing']) {
      expect(await findLayerMessages(importOf(source), themePath)).toEqual([]);
    }
  });
});

const appCodeLayers = [
  ['src/features/home/Example.tsx', 'features/home'],
  ['src/components/Example.tsx', 'components'],
  ['src/hooks/useExample.ts', 'hooks'],
  ['src/utils/example.ts', 'utils'],
  ['src/services/api/example.ts', 'services/api'],
  ['src/services/storage/example.ts', 'services/storage'],
  ['src/theme/example.ts', 'theme'],
];

describe('tipos globales y utilidades de test', () => {
  it('importar los tipos globales desde cualquier capa se rechaza con un mensaje que nombra la capa de origen', async () => {
    for (const [filePath, origin] of appCodeLayers) {
      expectLayerMessage(await findLayerMessages(importOf('@/types/env'), filePath), origin, 'types');
    }
  });

  it('el archivo de tipos globales sin importaciones se permite', async () => {
    const code = '/// <reference types="expo/types" />\n\ndeclare const example: string;\n';

    expect(await findLayerMessages(code, 'src/types/example.d.ts')).toEqual([]);
  });

  it('el código de la app que importa utilidades de test se rechaza y los tests y las utilidades de test pueden importar cualquier capa', async () => {
    for (const [filePath, origin] of appCodeLayers) {
      for (const source of ['@/test/fetchMock', '@/__tests__/lintLimits.test']) {
        expectLayerMessage(await findLayerMessages(importOf(source), filePath), origin, 'test');
      }
    }
    const anyLayer = ['@/features/home/greeting', '@/app/index', '@/theme/colors', '@/test/fetchMock', 'react'];
    for (const filePath of ['src/features/transfers/Example.test.tsx', 'src/test/exampleHelpers.ts', 'src/utils/example.cases.ts']) {
      for (const source of anyLayer) {
        expect(await findLayerMessages(importOf(source), filePath)).toEqual([]);
      }
    }
  });
});

describe('tests y tablas de casos junto al código', () => {
  const colocatedTests = [
    ['src/features/transfer-list/Example.tsx', 'features/transfer-list', './filterTransfers.test'],
    ['src/features/transfer-list/Example.tsx', 'features/transfer-list', './filterTransfers.cases'],
    ['src/components/Example.tsx', 'components', './Button.test'],
    ['src/components/Example.tsx', 'components', './BottomSheet.cases'],
    ['src/hooks/useExample.ts', 'hooks', './useAsync.concurrency.test'],
    ['src/utils/example.ts', 'utils', './date.range.test'],
    ['src/services/api/example.ts', 'services/api', './balance.test'],
    ['src/services/storage/example.ts', 'services/storage', './sessionStorage.test'],
    ['src/theme/example.ts', 'theme', './theme.test'],
  ];

  it.each(colocatedTests)(
    'el código de la app que importa un test o una tabla de casos de su carpeta se rechaza con un mensaje que nombra su capa y test (%s importa %s)',
    async (filePath, origin, source) => {
      expectLayerMessage(await findLayerMessages(importOf(source), filePath), origin, 'test');
    },
  );
});
