/** @jest-environment node */
import { expectError, setupLinter } from '../test/lintHelpers';

const findMessages = setupLinter();

const testOnlyPaths = [
  'src/features/demo/Example.test.tsx',
  'src/test/ExampleStub.tsx',
  'src/components/Example.cases.ts',
];

describe('reglas que siguen en los tests', () => {
  it('un test sigue rechazando un spinner y un color fuera del tema', async () => {
    const spinnerElement = 'export function Loading() {\n  return <ActivityIndicator />;\n}\n';
    const spinnerImport = "import { ActivityIndicator } from 'react-native';\n\nexport { ActivityIndicator };\n";
    const color = "export const value = '#092B6A';\n";

    for (const filePath of testOnlyPaths) {
      if (filePath.endsWith('.tsx')) {
        expectError(await findMessages(spinnerElement, 'no-restricted-syntax', filePath));
      }
      expectError(await findMessages(spinnerImport, 'no-restricted-imports', filePath));
      expectError(await findMessages(color, 'no-restricted-syntax', filePath));
    }
  });
});

describe('console', () => {
  const consoleCall = (method: string): string => `export function report() {\n  console.${method}('hola');\n}\n`;

  it.each(['log', 'info', 'warn', 'error', 'debug', 'table'])(
    'rechaza cada método de console en el código de la app (console.%s)',
    async (method) => {
      expectError(await findMessages(consoleCall(method), 'no-console'));
    },
  );

  it('permite console en un test, una utilidad de test y un archivo de configuración', async () => {
    for (const filePath of ['src/utils/example.test.ts', 'src/test/exampleHelpers.ts', 'jest.config.js']) {
      expect(await findMessages(consoleCall('log'), 'no-console', filePath)).toEqual([]);
    }
  });
});

describe('token fijo de la API de pruebas', () => {
  const fixedToken = 'fake-jwt-token';
  const tokenUses = [
    `export const token = '${fixedToken}';\n`,
    'export const token = `' + fixedToken + '`;\n',
    `export const header = 'Bearer ${fixedToken}';\n`,
  ];

  it('rechaza el token fijo de la API de pruebas en el código de la app, también dentro de otra cadena, con un mensaje que dice que sale de la sesión', async () => {
    for (const code of tokenUses) {
      const messages = await findMessages(code, 'no-restricted-syntax');

      expectError(messages);
      expect(messages.every((message) => message.message.includes('sesión'))).toBe(true);
    }
  });

  it('permite el token fijo de la API de pruebas en un test y en una utilidad de test', async () => {
    for (const filePath of ['src/services/api/example.test.ts', 'src/test/exampleFixtures.ts']) {
      for (const code of tokenUses) {
        expect(await findMessages(code, 'no-restricted-syntax', filePath)).toEqual([]);
      }
    }
  });
});

describe('nombres de campo de la API', () => {
  const apiNames = ['payeer', 'payeerDocument', 'accountBalance', 'transferDate'];
  const apiNameUses = (name: string): string[] => [
    `export const ${name} = 1;\n`,
    `export const value = { ${name}: 1 };\n`,
    `export const value = { '${name}': 1 };\n`,
    `export type Value = { '${name}': number };\n`,
    `export function read(value: Record<string, number>) {\n  return value['${name}'];\n}\n`,
  ];

  it.each(apiNames)(
    'rechaza cada nombre de campo de la API como identificador y como clave fuera del cliente, con un mensaje que los confina al cliente de la API (%s)',
    async (name) => {
      for (const code of apiNameUses(name)) {
        const messages = await findMessages(code, 'no-restricted-syntax');

        expectError(messages);
        expect(messages.every((message) => message.message.includes('src/services/api'))).toBe(true);
      }
    },
  );

  it('permite los nombres de campo de la API dentro del cliente, de un test y de una utilidad de test', async () => {
    const filePaths = ['src/services/api/example.ts', 'src/features/demo/Example.test.tsx', 'src/test/exampleFixtures.ts'];

    for (const filePath of filePaths) {
      for (const code of apiNames.flatMap(apiNameUses)) {
        expect(await findMessages(code, 'no-restricted-syntax', filePath)).toEqual([]);
      }
    }
  });

  it('no rechaza esos nombres dentro de un texto visible', async () => {
    const text = "export const label = 'payeer accountBalance';\n";
    const element = 'export function Label() {\n  return <Text>payeerDocument transferDate</Text>;\n}\n';

    expect(await findMessages(text, 'no-restricted-syntax')).toEqual([]);
    expect(await findMessages(element, 'no-restricted-syntax')).toEqual([]);
  });
});
