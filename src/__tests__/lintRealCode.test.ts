/** @jest-environment node */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { createLinter } from '../test/lintHelpers';

const srcDir = path.resolve(__dirname, '..');
const newRuleIds = [
  'no-console',
  'import/no-restricted-paths',
  'no-restricted-imports',
  'no-restricted-syntax',
];
const disabledNewRule = new RegExp(
  `eslint-disable[^\\n]*(${newRuleIds.join('|')})|eslint-disable(-next-line|-line)?\\s*(\\*/|$)`,
  'm',
);

function isAppCode(relativePath: string): boolean {
  const isTestCode =
    /\.test\.tsx?$/.test(relativePath) ||
    relativePath.endsWith('.cases.ts') ||
    relativePath.startsWith('test/') ||
    relativePath.startsWith('__tests__/');
  return /\.tsx?$/.test(relativePath) && !isTestCode;
}

function appCodeFiles(): string[] {
  return readdirSync(srcDir, { encoding: 'utf8', recursive: true })
    .map((entry) => entry.split(path.sep).join('/'))
    .filter(isAppCode)
    .map((entry) => path.join(srcDir, entry));
}

describe('código real de la app', () => {
  it('los archivos reales de la app pasan las cuatro reglas nuevas y ninguno las desactiva', async () => {
    const files = appCodeFiles();
    const results = await createLinter().lintFiles(files);

    const violations = results.flatMap((result) =>
      result.messages
        .filter((message) => newRuleIds.includes(message.ruleId ?? ''))
        .map((message) => `${path.relative(srcDir, result.filePath)}: ${message.message}`),
    );
    const disabling = files.filter((file) => disabledNewRule.test(readFileSync(file, 'utf8')));

    expect(files.length).toBeGreaterThan(150);
    expect(violations).toEqual([]);
    expect(disabling).toEqual([]);
  }, 120_000);
});
