import { readdirSync } from 'node:fs';
import path from 'node:path';

import { readText, rootDir } from './projectFiles';

// Un grupo: los ayudantes (cada uno con la utilidad de test que lo exporta), los tests que ya no
// pueden definirlos por su cuenta, los que deben importarlos de esa utilidad y el código que los
// sustituye y ya no puede escribirse en línea en esos tests.
export type HelperGroup = {
  name: string;
  helpers: Record<string, string>;
  files: string[];
  importers?: string[];
  inlineCopies?: RegExp[];
};

function exportsHelper(source: string, helper: string) {
  return new RegExp(`export\\s+(async\\s+)?(function|const)\\s+${helper}\\b`).test(source);
}

function definesHelper(source: string, helper: string) {
  return new RegExp(`\\b(function|const)\\s+${helper}\\b`).test(source);
}

// Ruta con alias de la utilidad: `src/test/focus.ts` → `@/test/focus`.
function moduleOf(shared: string) {
  return shared.replace(/^src\//, '@/').replace(/\.tsx?$/, '');
}

// Las utilidades de `src/test` importan a sus vecinas con ruta relativa: `./focus` equivale a `@/test/focus`.
function importsHelper(source: string, helper: string, shared: string) {
  const escape = (path: string) => path.replace(/[/.]/g, '\\$&');
  const from = `(${escape(moduleOf(shared))}|${escape(moduleOf(shared).replace(/^@\/test\//, './'))})`;
  return new RegExp(`import\\s*\\{[^}]*\\b${helper}\\b[^}]*\\}\\s*from\\s*'${from}'`).test(source);
}

// Lo que incumple el grupo: ayudantes sin exportar, copias locales, tests que no los importan de su sitio
// y copias en línea.
export function helperCopyProblems({ helpers, files, importers = [], inlineCopies = [] }: HelperGroup) {
  const entries = Object.entries(helpers);
  const notExported = entries.filter(([helper, shared]) => !exportsHelper(readText(shared), helper));
  const redefined = files.flatMap((file) =>
    entries.filter(([helper]) => definesHelper(readText(file), helper)).map(([helper]) => `${file}: ${helper}`),
  );
  const notImported = importers.flatMap((file) =>
    entries
      .filter(([helper, shared]) => !importsHelper(readText(file), helper, shared))
      .map(([helper]) => `${file}: ${helper}`),
  );
  const inlined = files.flatMap((file) =>
    inlineCopies.filter((pattern) => pattern.test(readText(file))).map((pattern) => `${file}: ${pattern.source}`),
  );
  return { notExported, redefined, notImported, inlined };
}

// Cuántas veces se define cada ayudante entre todos los archivos de código de `src`.
export function definitionCounts(helpers: string[]) {
  const sources = readdirSync(path.join(rootDir, 'src'), { encoding: 'utf8', recursive: true })
    .filter((entry) => /\.tsx?$/.test(entry))
    .map((entry) => readText(path.join('src', entry)));
  return Object.fromEntries(
    helpers.map((helper) => {
      const definition = new RegExp(`\\b(function|const)\\s+${helper}\\b`, 'g');
      return [helper, sources.reduce((total, source) => total + (source.match(definition)?.length ?? 0), 0)];
    }),
  );
}
