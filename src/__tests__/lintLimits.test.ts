/** @jest-environment node */
import { expectError, repeatLines, setupLinter } from '../test/lintHelpers';

const testFilePath = 'src/features/demo/Example.test.ts';

const findMessages = setupLinter();

function nestedViews(depth: number): string {
  const open = Array.from({ length: depth }, (_, level) => `${'  '.repeat(level + 2)}<View>`);
  const close = open.map((line) => line.replace('<View>', '</View>')).reverse();
  return [...open, `${'  '.repeat(depth + 2)}<Text>hola</Text>`, ...close].join('\n');
}

function screenWithDepth(depth: number): string {
  return `import { Text, View } from 'react-native';\n\nexport function Screen() {\n  return (\n${nestedViews(depth)}\n  );\n}\n`;
}

describe('límite de líneas por archivo', () => {
  it('rechaza un archivo de más de 150 líneas', async () => {
    const code = `${repeatLines(151, (index) => `export const value${index} = ${index};`)}\n`;

    expectError(await findMessages(code, 'max-lines'));
  });

  it('permite hasta 250 líneas en un archivo de test', async () => {
    const code = `${repeatLines(250, (index) => `export const value${index} = ${index};`)}\n`;

    expect(await findMessages(code, 'max-lines', testFilePath)).toEqual([]);
  });

  it('rechaza un archivo de test de más de 250 líneas', async () => {
    const code = `${repeatLines(251, (index) => `export const value${index} = ${index};`)}\n`;

    const messages = await findMessages(code, 'max-lines', testFilePath);

    expectError(messages);
    expect(messages[0].message).toContain('Maximum allowed is 250');
  });
});

describe('límite de líneas por función', () => {
  it('rechaza una función de más de 40 líneas', async () => {
    const body = repeatLines(40, (index) => `  total += ${index};`);
    const code = `export function longFunction(): number {\n  let total = 0;\n${body}\n  return total;\n}\n`;

    expectError(await findMessages(code, 'max-lines-per-function'));
  });
});

describe('límite de parámetros', () => {
  it('rechaza una función con más de 3 parámetros', async () => {
    const code = 'export function sum(a: number, b: number, c: number, d: number): number {\n  return a + b + c + d;\n}\n';

    expectError(await findMessages(code, 'max-params'));
  });
});

describe('límite de complejidad', () => {
  it('rechaza una complejidad mayor que 10', async () => {
    const branches = repeatLines(10, (index) => `  if (input === ${index}) return ${index};`);
    const code = `export function classify(input: number): number {\n${branches}\n  return -1;\n}\n`;

    expectError(await findMessages(code, 'complexity'));
  });
});

describe('límite de profundidad JSX', () => {
  it('rechaza JSX anidado a profundidad 4', async () => {
    expectError(await findMessages(screenWithDepth(4), 'react/jsx-max-depth'));
  });

  it('permite JSX anidado a profundidad 3', async () => {
    expect(await findMessages(screenWithDepth(3), 'react/jsx-max-depth')).toEqual([]);
  });
});
