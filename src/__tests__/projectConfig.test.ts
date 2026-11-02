/** @jest-environment node */
import fs from 'node:fs';
import path from 'node:path';

import { palette } from '@/theme';
import {
  type AppConfig,
  type PackageJson,
  readJson,
  readText,
  rootDir,
} from '@/test/projectFiles';

function exists(relativePath: string): boolean {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function readAppConfig(): AppConfig['expo'] {
  return readJson<AppConfig>('app.json').expo;
}

function findPlugin(name: string): Record<string, unknown> | undefined {
  const entry = readAppConfig().plugins?.find(
    (plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) === name,
  );
  if (entry === undefined) return undefined;
  return Array.isArray(entry) ? entry[1] : {};
}

describe('arranque de la app', () => {
  it('arranca con expo-router y sin los archivos de entrada de la plantilla', () => {
    const { main } = readJson<PackageJson>('package.json');

    expect(main).toBe('expo-router/entry');
    expect(exists('App.tsx')).toBe(false);
    expect(exists('index.ts')).toBe(false);
  });
});

describe('ejecución de los tests', () => {
  it('el script de tests ejecuta jest una sola vez sin modo watch', () => {
    const testScript = readJson<PackageJson>('package.json').scripts?.test ?? '';

    expect(testScript).toMatch(/\bjest\b/);
    expect(testScript).not.toMatch(/--watch/);
  });
});

describe('identidad de la app', () => {
  it('muestra el nombre BancoXYZ y el ícono adaptativo de anillos sobre azul marino', () => {
    const expo = readAppConfig();
    const brandAssets = [
      'icon.png',
      'android-icon-foreground.png',
      'android-icon-monochrome.png',
      'splash-icon.png',
      'logo-header.png',
    ];

    expect(expo.name).toBe('BancoXYZ');
    expect(expo.icon).toBe('./assets/icon.png');
    expect(expo.android?.adaptiveIcon).toEqual({
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
      backgroundColor: palette.navy,
    });
    expect(brandAssets.filter((file) => !exists(`assets/${file}`))).toEqual([]);
  });

  it('no conserva recursos ni configuración web de la plantilla', () => {
    expect(exists('assets/android-icon-background.png')).toBe(false);
    expect(exists('assets/favicon.png')).toBe(false);
    expect(readAppConfig().web).toBeUndefined();
    expect(readJson<PackageJson>('package.json').scripts).not.toHaveProperty('web');
  });

  it('usa el identificador com.bancoxyz.app en Android e iOS, el esquema bancoxyz y sin tablet', () => {
    const expo = readAppConfig();

    expect(expo.android?.package).toBe('com.bancoxyz.app');
    expect(expo.ios?.bundleIdentifier).toBe('com.bancoxyz.app');
    expect(expo.scheme).toBe('bancoxyz');
    expect(expo.ios?.supportsTablet).toBe(false);
  });
});

describe('apariencia del sistema', () => {
  it('bloquea la orientación vertical y el tema claro con expo-system-ui', () => {
    const expo = readAppConfig();
    const { dependencies } = readJson<PackageJson>('package.json');

    expect(expo.orientation).toBe('portrait');
    expect(expo.userInterfaceStyle).toBe('light');
    expect(expo.android?.userInterfaceStyle).toBe('light');
    expect(findPlugin('expo-system-ui')).toBeDefined();
    expect(dependencies).toHaveProperty('expo-system-ui');
  });

  it('configura la barra de estado con iconos oscuros', () => {
    expect(findPlugin('expo-status-bar')).toEqual({ style: 'dark' });
  });
});

describe('splash y licencias de tipografías', () => {
  it('configura el splash azul marino con los anillos a 240', () => {
    expect(findPlugin('expo-splash-screen')).toEqual({
      backgroundColor: palette.navy,
      image: './assets/splash-icon.png',
      imageWidth: 240,
      resizeMode: 'contain',
    });
  });

  it('incluye la licencia OFL 1.1 de Montserrat y Cabin en el repositorio', () => {
    const licenses = ['Montserrat-OFL.txt', 'Cabin-OFL.txt'].map(
      (file) => `assets/fonts/licenses/${file}`,
    );

    expect(licenses.filter((license) => !exists(license))).toEqual([]);
    licenses.forEach((license) => {
      expect(readText(license)).toContain('SIL OPEN FONT LICENSE Version 1.1');
    });
  });
});

describe('almacenamiento de la sesión', () => {
  it('guarda la sesión con el almacenamiento cifrado y fuera de la copia de seguridad de Android', () => {
    const { dependencies, devDependencies } = readJson<PackageJson>('package.json');
    const installed = { ...dependencies, ...devDependencies };
    const secureStorePlugin = findPlugin('expo-secure-store');

    expect(installed).toHaveProperty('expo-secure-store');
    expect(secureStorePlugin).toBeDefined();
    expect(secureStorePlugin).not.toHaveProperty('configureAndroidBackup', false);
    expect(installed).not.toHaveProperty('@react-native-async-storage/async-storage');
  });
});
