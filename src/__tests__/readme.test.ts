/** @jest-environment node */
import { type PackageJson, readJson, readText } from '@/test/projectFiles';

const testAccounts = [
  ['1', 'Gabriel Topaz', 'gabriel@topaz.com', '1111'],
  ['2', 'Alejo Topaz', 'alejo@topaz.com', '2222'],
  ['3', 'Wilson Topaz', 'wilson@topaz.com', '3333'],
];

function readReadme(): string {
  return readText('README.md');
}

function headings(level: number): string[] {
  const marker = `${'#'.repeat(level)} `;
  return readReadme()
    .split('\n')
    .filter((line) => line.startsWith(marker))
    .map((line) => line.slice(marker.length).trim());
}

// Texto bajo un título hasta el siguiente título del mismo nivel o superior.
function section(title: string, level = 2): string {
  const lines = readReadme().split('\n');
  const start = lines.indexOf(`${'#'.repeat(level)} ${title}`);
  if (start === -1) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^#{1,6} /.test(line) && line.indexOf(' ') <= level);
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
}

function tableRows(text: string): string[][] {
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

function citedScripts(): string[] {
  const text = readReadme();
  const runs = [...text.matchAll(/npm run ([\w:-]+)/g)].map((match) => match[1]);
  return /npm test\b/.test(text) ? [...runs, 'test'] : runs;
}

describe('README: puesta en marcha', () => {
  it('el README tiene las secciones de requisitos, instalación, ejecución y credenciales de prueba', () => {
    expect(headings(2)).toEqual(
      expect.arrayContaining(['Requisitos', 'Instalación', 'Ejecución', 'Credenciales de prueba']),
    );
    expect(section('Instalación')).toContain('npm ci');
    expect(section('Ejecución')).toContain('npx expo start');
    expect(section('Ejecución')).toContain('npx expo run:android');
    expect(section('Requisitos')).toMatch(/Node/);
    expect(section('Requisitos')).toMatch(/npm/);
    expect(section('Requisitos')).toMatch(/JDK 17/);
    expect(section('Requisitos')).toMatch(/Maestro/);
  });

  it('cada script de npm que cita el README existe en package.json', () => {
    const scripts = Object.keys(readJson<PackageJson>('package.json').scripts ?? {});
    const cited = citedScripts();

    expect(cited.length).toBeGreaterThan(0);
    expect(cited.filter((name) => !scripts.includes(name))).toEqual([]);
  });

  it('la sección de credenciales lista las cuentas de prueba con nombre, correo y contraseña', () => {
    const rows = tableRows(section('Credenciales de prueba'));

    expect(rows[0]).toEqual(['ID', 'Nombre', 'Email', 'Contraseña']);
    expect(rows.slice(1)).toEqual(testAccounts);
  });
});

describe('README: plataformas', () => {
  it('el README indica Android verificado en el emulador con la compilación release, sin afirmar un dispositivo físico, e iOS solo configurado', () => {
    const platforms = section('Plataformas');

    expect(platforms).toMatch(/Android/);
    expect(platforms).toMatch(/verificad[ao]/);
    expect(platforms).toMatch(/emulador/);
    expect(platforms).toMatch(/Android[^\n]*verificad[ao] en el emulador[^\n]*compilación release/);
    expect(platforms).not.toMatch(/dispositivo físico/);
    expect(platforms).toMatch(/iOS[^\n]*solo configurad[ao]/);
    expect(platforms).toMatch(/sin verificar en un dispositivo/);
  });
});

describe('README: pruebas', () => {
  it('el README tiene las secciones de pruebas y de Maestro con los comandos de calidad en orden', () => {
    const tests = section('Pruebas');
    const commands = [
      'npm run typecheck',
      'npx expo lint',
      'npm run format:check',
      'npm test',
      'npm run test:coverage',
    ];
    const positions = commands.map((command) => tests.indexOf(command));

    expect(headings(3)).toContain('Flujos funcionales con Maestro');
    expect(positions.filter((position) => position === -1)).toEqual([]);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(tests).toMatch(/80 %/);
  });

  it('la sección de Maestro explica la instalación, la compilación release, la ejecución de todos los flujos con un solo comando, que usan la API real con conexión y que no envían transferencias', () => {
    const maestro = section('Flujos funcionales con Maestro', 3);

    expect(maestro).toContain('curl -fsSL "https://get.maestro.mobile.dev" | bash');
    expect(maestro).toMatch(/Java 17 o 21/);
    expect(maestro).toContain('JAVA_HOME');
    expect(maestro).toContain('npx expo run:android --variant release');
    expect(maestro).toContain('maestro test .maestro/');
    expect(maestro).toMatch(/API real/);
    expect(maestro).toMatch(/conexión/);
    expect(maestro).toMatch(/sin sesión/);
    expect(maestro).toMatch(/no envía[n]? (ninguna )?transferencia/);
  });
});

describe('README: Java para Maestro', () => {
  it('la sección de Maestro recomienda Java 17 o 21, avisa de que con versiones más recientes funciona con avisos y deja JAVA_HOME solo para cuando falle', () => {
    const maestro = section('Flujos funcionales con Maestro', 3).replace(/\s+/g, ' ');

    expect(maestro).toContain('que recomienda Java 17 o 21');
    expect(maestro).toContain('versiones más recientes (por ejemplo, Java 25) funciona');
    expect(maestro).toContain('avisos de `sun.misc.Unsafe`');
    expect(maestro).toContain('Solo si falla, apuntar `JAVA_HOME` a un JDK 21');
    expect(maestro).toContain('JAVA_HOME=/ruta/al/jdk-21 maestro test .maestro/');
    expect(maestro).not.toMatch(/necesita Java/);
    expect(maestro.indexOf('JAVA_HOME')).toBeGreaterThan(maestro.indexOf('Solo si falla'));
  });
});

describe('README: el proyecto', () => {
  it('el README tiene las secciones de estructura de carpetas, funcionalidades, decisiones técnicas y licencia', () => {
    expect(headings(2)).toEqual(
      expect.arrayContaining(['Estructura de carpetas', 'Funcionalidades', 'Decisiones técnicas', 'Licencia']),
    );
    expect(section('Estructura de carpetas')).toContain('src/features/');
  });

  it('el README describe login con sesión guardada y cierre de sesión, saldo con ojo, transferencia programada con confirmación y duplicados, y listado con filtros por nombre, valor y fecha', () => {
    const features = section('Funcionalidades');

    expect(features).toMatch(/sesión guardada/);
    expect(features).toMatch(/cierre de sesión/);
    expect(features).toMatch(/saldo/);
    expect(features).toMatch(/ojo/);
    expect(features).toMatch(/programada/);
    expect(features).toMatch(/confirmación/);
    expect(features).toMatch(/duplicad[ao]s/);
    expect(features).toMatch(/nombre, valor y fecha/);
  });

  it('el README resume las decisiones técnicas: stack, arquitectura por funcionalidades, estado, estrategia de pruebas y API simulada', () => {
    const decisions = section('Decisiones técnicas');

    expect(decisions).toMatch(/Expo/);
    expect(decisions).toMatch(/TypeScript estricto/);
    expect(decisions).toMatch(/por funcionalidades/);
    expect(decisions).toMatch(/Zustand/);
    expect(decisions).toMatch(/pirámide/);
    expect(decisions).toMatch(/valores límite/);
    expect(decisions).toMatch(/simulada/);
    expect(decisions).toMatch(/el saldo y el listado no cambian/);
  });
});

describe('README: destinatario de la transferencia', () => {
  it('las decisiones técnicas explican que el destinatario se identifica solo por documento porque la API solo recibe payeerDocument', () => {
    const decisions = section('Decisiones técnicas').replace(/\s+/g, ' ');

    expect(decisions).toContain('solo por su documento');
    expect(decisions).toContain('CPF de 11 dígitos o CNPJ de 14');
    expect(decisions).toContain('`payeerDocument`');
    expect(decisions).toMatch(/no un nombre/);
    expect(decisions).toMatch(/nombre del destinatario aparece en el listado porque lo devuelve la API/);
  });
});

describe('README: autoría', () => {
  it('el nombre del autor solo aparece en la línea de licencia del README', () => {
    const holder = readText('LICENSE').match(/^Copyright \(c\) 2026 (.+)$/m)?.[1].trim() ?? '';
    const lines = readReadme().split('\n');

    expect(holder).not.toBe('');
    expect(lines.filter((line) => line.includes(holder))).toEqual([`Licencia MIT © 2026 ${holder}`]);
    expect(readReadme().split(holder)).toHaveLength(2);
  });
});
