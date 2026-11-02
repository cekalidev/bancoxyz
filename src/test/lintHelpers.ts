import path from 'node:path';

import { ESLint, Linter } from 'eslint';

export const appFilePath = 'src/features/demo/Example.tsx';

type FindMessages = (
  code: string,
  ruleId: string,
  targetPath?: string,
) => Promise<Linter.LintMessage[]>;

const rootDir = path.resolve(__dirname, '../..');

export function createLinter(): ESLint {
  return new ESLint({
    cwd: rootDir,
    overrideConfigFile: true,
    overrideConfig: jest.requireActual(path.join(rootDir, 'eslint.config.js')),
  });
}

export function setupLinter(): FindMessages {
  let eslint: ESLint;

  beforeAll(() => {
    eslint = createLinter();
  });

  return async (code, ruleId, targetPath = appFilePath) => {
    const [result] = await eslint.lintText(code, { filePath: targetPath });
    return result.messages.filter((message) => message.ruleId === ruleId);
  };
}

export function repeatLines(count: number, line: (index: number) => string): string {
  return Array.from({ length: count }, (_, index) => line(index)).join('\n');
}

export function expectError(messages: Linter.LintMessage[]): void {
  expect(messages.length).toBeGreaterThan(0);
  expect(messages.every((message) => message.severity === 2)).toBe(true);
}

const layerRuleIds = ['import/no-restricted-paths', 'no-restricted-imports', 'no-restricted-syntax'];

let layerLinter: ESLint | undefined;

export async function findLayerMessages(
  code: string,
  filePath: string,
): Promise<Linter.LintMessage[]> {
  layerLinter ??= createLinter();
  const [result] = await layerLinter.lintText(code, { filePath });
  return result.messages.filter((message) => layerRuleIds.includes(message.ruleId ?? ''));
}

export function expectLayerMessage(
  messages: Linter.LintMessage[],
  origin: string,
  destination: string,
): void {
  expectError(messages);
  for (const { message } of messages) {
    expect(message).toContain(`La capa ${origin} `);
    expect(message).toContain(destination);
  }
}

export function importOf(source: string): string {
  return `import { layer } from '${source}';\n\nexport { layer };\n`;
}
