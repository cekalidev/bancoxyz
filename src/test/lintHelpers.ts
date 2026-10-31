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
