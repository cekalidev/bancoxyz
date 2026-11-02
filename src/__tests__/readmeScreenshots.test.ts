/** @jest-environment node */
import fs from 'node:fs';
import path from 'node:path';
import { rootDir } from '@/test/projectFiles';
import { readmeLines, readmeSection, markdownTableRows } from '@/test/readmeSections';

const expectedSources = [
  'docs/capturas/login.png',
  'docs/capturas/inicio-saldo.png',
  'docs/capturas/nueva-transferencia.png',
  'docs/capturas/confirmacion.png',
  'docs/capturas/resultado.png',
  'docs/capturas/listado.png',
];
const maxBytes = 150 * 1024;

function capturesSection(): string {
  return readmeSection('Capturas');
}

function attribute(tag: string, name: string): string {
  return tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? '';
}

function images(): { src: string; alt: string }[] {
  return [...capturesSection().matchAll(/<img\b[^>]*>/g)].map(([tag]) => ({
    src: attribute(tag, 'src'),
    alt: attribute(tag, 'alt'),
  }));
}

describe('README: capturas', () => {
  it('la sección de capturas va antes de los requisitos y aclara que son de la compilación release en Android', () => {
    const lines = readmeLines();
    const captures = capturesSection();

    expect(lines).toContain('## Capturas');
    expect(lines.indexOf('## Capturas')).toBeLessThan(lines.indexOf('## Requisitos'));
    expect(captures).toMatch(/compilación release/);
    expect(captures).toMatch(/Android/);
  });

  it('la sección de capturas referencia las seis capturas de docs/capturas en orden', () => {
    expect(images().map((image) => image.src)).toEqual(expectedSources);
  });

  it('cada captura tiene un texto alternativo descriptivo', () => {
    const found = images();

    expect(found).toHaveLength(expectedSources.length);
    expect(found.filter((image) => image.alt.trim() === '')).toEqual([]);
    expect(new Set(found.map((image) => image.alt)).size).toBe(expectedSources.length);
  });
});

describe('README: tabla y archivos de las capturas', () => {
  it('las capturas van en una tabla de tres columnas con un pie bajo cada imagen', () => {
    const rows = markdownTableRows(capturesSection());
    const imageRows = rows.filter((row) => row.some((cell) => cell.includes('<img')));

    expect(imageRows).toHaveLength(2);
    expect(rows.every((row) => row.length === 3)).toBe(true);
    imageRows.forEach((row) => {
      const caption = rows[rows.indexOf(row) + 1] ?? [];
      expect(row.every((cell) => cell.startsWith('<img'))).toBe(true);
      expect(caption.every((cell) => cell !== '' && !cell.includes('<img'))).toBe(true);
    });
  });

  it('cada captura referenciada existe en disco y pesa menos de 150 KB', () => {
    const sources = images().map((image) => image.src);
    const files = sources.map((src) => path.join(rootDir, src));

    expect(sources).toHaveLength(expectedSources.length);
    expect(files.filter((file) => !fs.existsSync(file))).toEqual([]);
    expect(files.filter((file) => fs.statSync(file).size >= maxBytes)).toEqual([]);
  });
});
