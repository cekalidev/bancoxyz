/** @jest-environment node */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { type PackageJson, readJson, readText, rootDir } from '@/test/projectFiles';

type JestConfig = {
  collectCoverage?: boolean;
  collectCoverageFrom?: string[];
  coverageReporters?: string[];
  coverageThreshold?: { global?: Record<string, number> };
};

const eightyPercent = { lines: 80, branches: 80, functions: 80, statements: 80 };

const formatTargets = [
  'src/**/*.{ts,tsx}',
  'eslint/**/*.js',
  'eslint.config.js',
  'jest.config.js',
  'app.json',
  'package.json',
  'tsconfig.json',
  'README.md',
];

const formatIgnoredPatterns = [
  '**/*.test.ts',
  '**/*.test.tsx',
  'src/test/',
  'src/__tests__/',
  '**/*.cases.ts',
];

function readScripts(): Record<string, string> {
  return readJson<PackageJson>('package.json').scripts ?? {};
}

function readJestConfig(): JestConfig {
  return jest.requireActual<JestConfig>(path.join(rootDir, 'jest.config.js'));
}

function readIfPresent(file: string): string {
  return fs.existsSync(path.join(rootDir, file)) ? readText(file) : '';
}

function scriptTargets(script: string): string[] {
  const tokens = script.match(/"[^"]*"|\S+/g) ?? [];
  return tokens.slice(2).map((token) => token.replaceAll('"', ''));
}

function isMeasured(file: string, patterns: string[]): boolean {
  const matches = (pattern: string) => path.matchesGlob(file, pattern);
  const included = patterns.filter((p) => !p.startsWith('!')).some(matches);
  const excluded = patterns.filter((p) => p.startsWith('!')).some((p) => matches(p.slice(1)));
  return included && !excluded;
}

function isTestSupportFile(file: string): boolean {
  return (
    /\.test\.tsx?$/.test(file) ||
    file.startsWith('src/test/') ||
    file.startsWith('src/__tests__/') ||
    file.endsWith('.cases.ts')
  );
}

function listSourceFiles(): string[] {
  return fs
    .globSync('src/**/*.{ts,tsx}', { cwd: rootDir })
    .map((file) => file.split(path.sep).join('/'));
}

describe('comprobación de tipos', () => {
  it('el script de tipos ejecuta tsc sin emitir', () => {
    expect(readScripts().typecheck).toBe('tsc --noEmit');
  });
});

describe('ejecución con cobertura', () => {
  it('la ejecución con cobertura corre jest con cobertura y resume líneas, ramas, funciones y sentencias', () => {
    expect(readScripts()['test:coverage']).toBe('jest --coverage');
    expect(readJestConfig().coverageReporters).toEqual(['text-summary', 'lcov']);
  });

  it('la cobertura mide todo el código de src salvo los tests, las utilidades de test y las tablas de casos', () => {
    const patterns = readJestConfig().collectCoverageFrom ?? [];
    const measured = ['src/app/index.tsx', 'src/types/env.d.ts', 'src/features/home/balanceView.ts'];
    const skipped = [
      'src/components/AppHeader.test.tsx',
      'src/test/apiFixtures.ts',
      'src/__tests__/navigation.test.tsx',
      'src/features/transfer-list/filterTransfers.cases.ts',
    ];
    const appFiles = listSourceFiles().filter((file) => !isTestSupportFile(file));

    expect(measured.filter((file) => !isMeasured(file, patterns))).toEqual([]);
    expect(skipped.filter((file) => isMeasured(file, patterns))).toEqual([]);
    expect(appFiles.filter((file) => !isMeasured(file, patterns))).toEqual([]);
  });

  it('el umbral global de la cobertura es el 80 % en líneas, ramas, funciones y sentencias', () => {
    expect(readJestConfig().coverageThreshold).toEqual({ global: eightyPercent });
  });

  it('npm test no mide cobertura ni aplica umbral y la ejecución con cobertura exige el 80 %', () => {
    const packageJest = readJson<PackageJson>('package.json').jest ?? {};
    const config = readJestConfig();

    expect(readScripts().test).toBe('jest');
    expect(config.collectCoverage ?? false).toBe(false);
    expect(packageJest).not.toHaveProperty('collectCoverage');
    expect(packageJest).not.toHaveProperty('coverageThreshold');
    expect(config.coverageThreshold?.global).toEqual(eightyPercent);
  });
});

describe('informe de cobertura', () => {
  it('git ignora la carpeta del informe de cobertura', () => {
    const result = spawnSync('git', ['check-ignore', '-q', 'coverage/lcov-report/index.html'], {
      cwd: rootDir,
    });

    expect(result.status).toBe(0);
  });
});

describe('formato del código', () => {
  it('Prettier usa comillas simples y el script de formato revisa el código de la app, la configuración y el README', () => {
    const config: unknown = JSON.parse(readIfPresent('.prettierrc.json') || '{}');
    const script = readScripts()['format:check'] ?? '';

    expect(config).toEqual({ singleQuote: true, printWidth: 110 });
    expect(script).toMatch(/^prettier --check /);
    expect(scriptTargets(script)).toEqual(formatTargets);
  });

  it('Prettier no revisa los tests ni las utilidades de test', () => {
    const entries = readIfPresent('.prettierignore')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '' && !line.startsWith('#'));

    expect([...entries].sort()).toEqual([...formatIgnoredPatterns].sort());
  });
});

describe('licencia', () => {
  it('la licencia es MIT de 2026 sin el titular de la plantilla ni datos personales y siguen las licencias de las tipografías', () => {
    const license = readText('LICENSE');
    const copyright = license.match(/^Copyright \(c\) 2026 (.+)$/m);

    expect(license.split('\n')[0]).toBe('MIT License');
    expect(copyright?.[1].trim()).toMatch(/^\p{L}+( \p{L}+)+$/u);
    expect(license).not.toMatch(/Expo|650 Industries/);
    expect(license).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    expect(license).not.toMatch(/\d{5,}|\d{3}[\s.-]\d{3,}/);
    expect(fs.existsSync(path.join(rootDir, 'assets/fonts/licenses/Montserrat-OFL.txt'))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, 'assets/fonts/licenses/Cabin-OFL.txt'))).toBe(true);
  });
});
