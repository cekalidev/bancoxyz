import fs from 'node:fs';
import path from 'node:path';

export const rootDir = path.resolve(__dirname, '../..');

export type PackageJson = {
  main?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  jest?: Record<string, unknown>;
};

type PluginEntry = string | [string, Record<string, unknown>];

export type AppConfig = {
  expo: {
    name?: string;
    scheme?: string;
    orientation?: string;
    userInterfaceStyle?: string;
    icon?: string;
    ios?: { supportsTablet?: boolean; bundleIdentifier?: string };
    android?: {
      package?: string;
      userInterfaceStyle?: string;
      adaptiveIcon?: {
        foregroundImage?: string;
        monochromeImage?: string;
        backgroundImage?: string;
        backgroundColor?: string;
      };
    };
    web?: unknown;
    plugins?: PluginEntry[];
  };
};

export function readText(relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

export function readJson<T>(relativePath: string): T {
  return JSON.parse(readText(relativePath));
}
