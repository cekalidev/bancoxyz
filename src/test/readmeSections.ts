import { readText } from './projectFiles';

// Contenido del README tal cual está en disco.
export function readReadme(): string {
  return readText('README.md');
}

// Líneas del README.
export function readmeLines(): string[] {
  return readReadme().split('\n');
}

// Texto bajo un título hasta el siguiente título del mismo nivel o superior; vacío si el título no existe.
export function readmeSection(title: string, level = 2): string {
  const lines = readmeLines();
  const start = lines.indexOf(`${'#'.repeat(level)} ${title}`);
  if (start === -1) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^#{1,6} /.test(line) && line.indexOf(' ') <= level);
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
}

// Filas de las tablas de un texto en Markdown, sin la línea separadora y con las celdas recortadas.
export function markdownTableRows(text: string): string[][] {
  return text
    .split('\n')
    .filter((line) => line.trim().startsWith('|') && !/^\|[\s|:-]+\|$/.test(line.trim()))
    .map((line) =>
      line
        .trim()
        .slice(1, -1)
        .split('|')
        .map((cell) => cell.trim()),
    );
}
