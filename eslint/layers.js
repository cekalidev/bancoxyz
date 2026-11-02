const fs = require('node:fs');
const path = require('node:path');

const featuresDir = path.resolve(__dirname, '../src/features');
const testLayer = ['test', '__tests__'];
const colocatedTestFiles = ['**/*.test.*', '**/*.cases.ts'];
const pureFiles = ['features/**/validate*.ts', 'features/**/filter*.ts'];
const pureOrigin = 'validateX/filterX';

const features = fs
  .readdirSync(featuresDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => `features/${entry.name}`);

const appCodeLayers = [
  'app',
  ...features,
  'services/api',
  'services/storage',
  'components',
  'hooks',
  'utils',
  'theme',
];

function zone(origin, destination, options = {}) {
  const destinations = [].concat(options.from ?? destination);
  const detail = options.detail ? `: ${options.detail}` : '';
  return {
    target: [].concat(options.target ?? origin).map((target) => `./src/${target}`),
    from: destinations.map((layer) => `./src/${layer}`),
    ...(options.except ? { except: options.except } : {}),
    message: `La capa ${origin} no puede importar ${destination}${detail}`,
  };
}

function zonesFrom(origin, destinations) {
  return destinations.map((destination) => zone(origin, destination));
}

function internalFilesZone(origin, destination, detail) {
  return zone(origin, `archivos internos de ${destination}`, {
    from: destination,
    except: ['./index.ts'],
    detail,
  });
}

const featureZones = features.flatMap((origin) => [
  ...features
    .filter((destination) => destination !== origin)
    .map((destination) => internalFilesZone(origin, destination, 'usa su index')),
  zone(origin, 'app', { target: `${origin}/**/!(validate*|filter*).{ts,tsx}` }),
]);

const pureFileZones = [
  ...['components', 'hooks', 'theme', 'app'].map((destination) =>
    zone(pureOrigin, destination, { target: pureFiles }),
  ),
  zone(pureOrigin, 'services', {
    target: pureFiles,
    except: ['./api/types.ts'],
    detail: 'solo los tipos de dominio de la API',
  }),
];

const sharedCodeZones = [
  ...zonesFrom('services/api', ['features', 'components', 'hooks', 'theme', 'app', 'services/storage']),
  ...zonesFrom('services/storage', ['features', 'components', 'hooks', 'theme', 'app']),
  zone('services/storage', 'services/api', {
    except: ['./types.ts', './guards.ts'],
    detail: 'solo sus tipos y sus guardas',
  }),
  ...zonesFrom('components', ['features', 'services', 'hooks', 'app']),
  ...zonesFrom('hooks', ['features', 'services', 'components', 'theme', 'app']),
  ...zonesFrom('utils', ['features', 'services', 'components', 'hooks', 'theme', 'app']),
];

const themeZones = [
  internalFilesZone('features', 'theme', 'usa @/theme'),
  internalFilesZone('components', 'theme', 'usa @/theme'),
  ...zonesFrom('theme', ['features', 'services', 'components', 'hooks', 'utils', 'app']),
];

const typesAndTestZones = appCodeLayers.flatMap((origin) => [
  zone(origin, 'types'),
  zone(origin, 'test', { from: testLayer }),
  zone(origin, 'test', { from: colocatedTestFiles }),
]);

const layerZones = [
  ...featureZones,
  ...pureFileZones,
  ...sharedCodeZones,
  ...themeZones,
  ...typesAndTestZones,
];

function packageBans(origin, packages) {
  const message = (name) => `La capa ${origin} no puede importar ${name}`;
  const paths = packages.filter((name) => name !== 'expo').map((name) => ({ name, message: message(name) }));
  const patterns = packages.includes('expo') ? [{ regex: '^expo($|-)', message: message('expo') }] : [];
  return { paths, patterns };
}

const layerImportBlocks = [
  {
    files: ['src/services/api/**/*.{ts,tsx}'],
    ...packageBans('services/api', ['react', 'react-native', 'zustand', 'expo']),
  },
  {
    files: ['src/services/storage/**/*.{ts,tsx}'],
    ...packageBans('services/storage', ['react', 'react-native', 'zustand']),
  },
  {
    files: ['src/utils/**/*.{ts,tsx}'],
    ...packageBans('utils', ['react', 'react-native', 'zustand', 'expo']),
  },
  {
    files: pureFiles.map((pattern) => `src/${pattern}`),
    ...packageBans(pureOrigin, ['react', 'react-native', 'zustand', 'expo']),
  },
];

module.exports = { layerImportBlocks, layerZones };
