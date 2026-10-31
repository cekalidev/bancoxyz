/** @jest-environment node */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { createLinter, expectError, setupLinter } from '../test/lintHelpers';

const themeFilePath = 'src/theme/example.ts';

const findMessages = setupLinter();

function constant(value: string): string {
  return 'export const value = ' + value + ';\n';
}

async function expectSkeletonError(code: string, ruleId: string): Promise<void> {
  const messages = await findMessages(code, ruleId);

  expectError(messages);
  expect(messages.every((message) => message.message.toLowerCase().includes('skeleton'))).toBe(
    true,
  );
}

describe('spinners', () => {
  it('rechaza importar ActivityIndicator y sugiere skeletons', async () => {
    const code = "import { ActivityIndicator } from 'react-native';\n\nexport { ActivityIndicator };\n";

    await expectSkeletonError(code, 'no-restricted-imports');
  });

  it('rechaza usar ActivityIndicator en JSX y sugiere skeletons', async () => {
    const direct = 'export function Loading() {\n  return <ActivityIndicator />;\n}\n';
    const member =
      "import * as RN from 'react-native';\n\n" +
      'export function Loading() {\n  return <RN.ActivityIndicator />;\n}\n';

    await expectSkeletonError(direct, 'no-restricted-syntax');
    await expectSkeletonError(member, 'no-restricted-syntax');
  });
});

describe('colores fuera del tema', () => {
  it('rechaza colores hex y rgb fuera del tema', async () => {
    for (const color of ["'#FFF'", "'#092B6A'", "'rgba(0, 0, 0, 0.5)'"]) {
      expectError(await findMessages(constant(color), 'no-restricted-syntax'));
    }
  });

  it('rechaza colores en plantillas de texto', async () => {
    for (const color of ['`#FFFFFF`', '`rgb(1, 2, 3)`']) {
      expectError(await findMessages(constant(color), 'no-restricted-syntax'));
    }
  });

  it('permite colores dentro del tema', async () => {
    const code = constant("{ white: '#FFF', brand: '#092B6A', scrim: 'rgba(0, 0, 0, 0.5)' }");

    expect(await findMessages(code, 'no-restricted-syntax', themeFilePath)).toEqual([]);
  });
});

describe('pesos tipográficos', () => {
  it('rechaza fontWeight con clave simple o entre comillas', async () => {
    for (const style of ["{ fontWeight: '700' }", "{ 'fontWeight': '700' }"]) {
      expectError(await findMessages(constant(style), 'no-restricted-syntax'));
    }
  });
});

describe('archivos de rutas', () => {
  const routeFilePath = 'src/app/index.tsx';

  async function expectRouteError(code: string): Promise<void> {
    const messages = await findMessages(code, 'no-restricted-syntax', routeFilePath);

    expectError(messages);
    expect(messages.every((message) => message.message.includes('reexportan'))).toBe(true);
  }

  it('permite una ruta que solo reexporta una pantalla', async () => {
    const code = "export { HomeScreen as default } from '@/features/home';\n";

    expect(await findMessages(code, 'no-restricted-syntax', routeFilePath)).toEqual([]);
  });

  it('rechaza una ruta con lógica propia', async () => {
    const code =
      "import { Text } from 'react-native';\n\n" +
      'export default function Home() {\n  return <Text>Hola</Text>;\n}\n';

    await expectRouteError(code);
  });

  it('rechaza una ruta que reexporta desde fuera de una funcionalidad', async () => {
    for (const source of ["'react-native'", "'@/components/x'", "'@/features/home/screens'"]) {
      await expectRouteError('export { default } from ' + source + ';\n');
    }
  });
});

describe('rutas reales de la app', () => {
  const appDir = path.resolve(__dirname, '../app');
  const routeModules = ['_layout', 'index', '+not-found'];

  it('las rutas reales de la app pasan el lint', async () => {
    const linter = createLinter();

    for (const file of readdirSync(appDir)) {
      const filePath = path.join(appDir, file);
      const [result] = await linter.lintText(readFileSync(filePath, 'utf8'), { filePath });
      expect(result.messages).toEqual([]);
    }
    for (const route of routeModules) {
      const routeModule = jest.requireActual(path.join(appDir, route));
      expect(typeof routeModule.default).toBe('function');
    }
  });
});
