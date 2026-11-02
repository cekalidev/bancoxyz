/** @jest-environment node */
import { readmeLines, readmeSection } from '@/test/readmeSections';

const releasesPage = 'https://github.com/cekalidev/bancoxyz/releases/latest';
const apkDownload = 'https://github.com/cekalidev/bancoxyz/releases/download/v1.0.0/bancoxyz-v1.0.0.apk';

function numberedSteps(text: string): string[] {
  return text.split('\n').filter((line) => /^\d+\. /.test(line));
}

describe('README: descarga de la APK', () => {
  it('la sección de la APK va entre las capturas y los requisitos', () => {
    const lines = readmeLines();
    const apk = lines.indexOf('## Descargar la APK');

    expect(apk).toBeGreaterThan(lines.indexOf('## Capturas'));
    expect(apk).toBeLessThan(lines.indexOf('## Requisitos'));
  });

  it('la sección de la APK enlaza la página de la última versión y la descarga directa del archivo', () => {
    const apk = readmeSection('Descargar la APK');

    expect(apk).toContain(releasesPage);
    expect(apk).toContain(apkDownload);
  });

  it('la sección de la APK explica la instalación en tres pasos numerados y enlaza las credenciales de prueba', () => {
    const apk = readmeSection('Descargar la APK');
    const steps = numberedSteps(apk);

    expect(steps).toHaveLength(3);
    expect(steps.map((step) => step.slice(0, 2))).toEqual(['1.', '2.', '3.']);
    expect(steps[1]).toMatch(/origen desconocido/);
    expect(steps[2]).toContain('[Credenciales de prueba](#credenciales-de-prueba)');
  });

  it('la sección de la APK aclara que es la versión 1.0.0 de Android, firmada con la clave de depuración, y que Play Protect puede avisar', () => {
    const apk = readmeSection('Descargar la APK').replace(/\s+/g, ' ');

    expect(apk).toMatch(/1\.0\.0/);
    expect(apk).toMatch(/Android/);
    expect(apk).toMatch(/compilación release/);
    expect(apk).toMatch(/clave de depuración/);
    expect(apk).toMatch(/Play Protect/);
  });
});

describe('README: instalación', () => {
  it('la instalación clona el repositorio, entra en la carpeta e instala las dependencias, en ese orden', () => {
    const install = readmeSection('Instalación');
    const commands = [
      'git clone https://github.com/cekalidev/bancoxyz.git',
      'cd bancoxyz',
      'npm ci',
    ];
    const positions = commands.map((command) => install.indexOf(command));

    expect(positions.filter((position) => position === -1)).toEqual([]);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });
});
