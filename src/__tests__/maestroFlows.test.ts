/** @jest-environment node */
import fs from 'node:fs';
import path from 'node:path';

import { readText, rootDir } from '@/test/projectFiles';

const appIdLine = 'appId: com.bancoxyz.app';
const loginSubflow = 'subflows/login.yaml';
const balance = "assertVisible: 'US\\$.[0-9.]+,[0-9]{2}'";
const startClean = ['launchApp: clearState: true', `runFlow: ${loginSubflow}`];

function flowText(name: string): string {
  const file = path.join('.maestro', name);
  return fs.existsSync(path.join(rootDir, file)) ? readText(file) : '';
}

// Cada comando de primer nivel en una sola línea, con sus líneas anidadas unidas por espacios.
function commandsOf(name: string): string[] {
  const [, body = ''] = flowText(name).split(/^---$/m);
  const commands: string[] = [];
  for (const line of body.split('\n')) {
    if (line.startsWith('- ')) commands.push(line.slice(2).trim());
    else if (line.trim() !== '' && commands.length > 0) commands.push(`${commands.pop()} ${line.trim()}`);
  }
  return commands;
}

// Los comandos esperados aparecen en ese orden, aunque haya otros entre medias.
function expectInOrder(commands: string[], expected: string[]): void {
  let from = 0;
  for (const command of expected) {
    const position = commands.indexOf(command, from);
    expect({ command, found: position !== -1 }).toEqual({ command, found: true });
    from = position + 1;
  }
}

function expectKeyboardHiddenOnlyAfterTyping(commands: string[]): void {
  commands.forEach((command, index) => {
    if (command === 'hideKeyboard') expect(commands[index - 1]).toMatch(/^inputText: /);
  });
}

describe('carpeta de flujos y subflujo de inicio de sesión', () => {
  it('la carpeta de flujos ejecuta solo los de primer nivel y tiene un subflujo de inicio de sesión que no se ejecuta solo', () => {
    const commands = commandsOf(loginSubflow);

    expect(flowText('config.yaml').trim()).toBe("flows:\n  - '*'");
    expect(flowText(loginSubflow).split('\n')[0]).toBe(appIdLine);
    expectInOrder(commands, [
      'tapOn: "Correo electrónico"',
      'inputText: "gabriel@topaz.com"',
      'tapOn: "Contraseña"',
      'inputText: "1111"',
      'tapOn: "Entrar"',
      'extendedWaitUntil: visible: "Hola, .+" timeout: 20000',
    ]);
    expectKeyboardHiddenOnlyAfterTyping(commands);
  });
});

describe('flujo de login y saldo', () => {
  it('el flujo de login y saldo parte sin sesión, comprueba saludo y cifra, oculta el saldo y lo vuelve a mostrar', () => {
    expect(flowText('login-saldo.yaml').split('\n')[0]).toBe(appIdLine);
    expectInOrder(commandsOf('login-saldo.yaml'), [
      ...startClean,
      'assertVisible: "Hola, .+"',
      balance,
      'tapOn: "Ocultar saldo"',
      "assertVisible: 'US\\$.••••••'",
      'tapOn: "Mostrar saldo"',
      balance,
    ]);
  });
});

describe('flujo de transferencia', () => {
  it('el flujo de transferencia llega a la confirmación con los datos introducidos, no la confirma y vuelve atrás', () => {
    const commands = commandsOf('transferencia.yaml');

    expect(flowText('transferencia.yaml').split('\n')[0]).toBe(appIdLine);
    expectInOrder(commands, [
      ...startClean,
      'tapOn: "Nueva transferencia"',
      'tapOn: "Valor"',
      'inputText: "100000"',
      'tapOn: "Documento del destinatario"',
      'inputText: "12345678909"',
      "copyTextFrom: text: 'Hoy, [0-9]{2}/[0-9]{2}/[0-9]{4}'",
      'tapOn: "Continuar"',
      "assertVisible: 'US\\$.1\\.000,00'",
      "assertVisible: 'CPF 123\\.456\\.789-09'",
      'assertVisible: "${maestro.copiedText}"',
    ]);
    expect(commands.at(-1)).toBe('back');
    expect(commands.filter((command) => /Confirmar transferencia|Enviar otra igual/.test(command))).toEqual([]);
    expectKeyboardHiddenOnlyAfterTyping(commands);
  });
});

describe('flujo de cierre de sesión', () => {
  it('el flujo de cierre de sesión pulsa Salir, confirma en el diálogo y comprueba el login', () => {
    expect(flowText('cierre-sesion.yaml').split('\n')[0]).toBe(appIdLine);
    expectInOrder(commandsOf('cierre-sesion.yaml'), [
      ...startClean,
      'tapOn: "Cerrar sesión"',
      "assertVisible: '¿Cerrar sesión\\?'",
      'tapOn: id: "android:id/button1"',
      'assertVisible: "Hola de nuevo"',
    ]);
  });
});

describe('flujo del listado', () => {
  it('el flujo del listado muestra las transferencias reales y la búsqueda MESSI deja una de tres', () => {
    const realPayees = ['Ronaldo de Assis Moreira', 'Lionel Andres Messi', 'Federico Valverde'];

    expect(flowText('listado.yaml').split('\n')[0]).toBe(appIdLine);
    expectInOrder(commandsOf('listado.yaml'), [
      ...startClean,
      'tapOn: "Ver transferencias"',
      ...realPayees.map((name) => `extendedWaitUntil: visible: "${name}" timeout: 20000`),
      'tapOn: "Nombre del destinatario"',
      'inputText: "MESSI"',
      'hideKeyboard',
      'assertVisible: "1 de 3 transferencias"',
      'assertNotVisible: "Federico Valverde"',
    ]);
  });
});

function topLevelFlows(): string[] {
  return fs
    .readdirSync(path.join(rootDir, '.maestro'))
    .filter((name) => name.endsWith('.yaml') && name !== 'config.yaml');
}

// Correos y contraseñas de la tabla de credenciales de prueba del README.
function readmeCredentials(): { emails: string[]; passwords: string[] } {
  const rows = [...readText('README.md').matchAll(/^\| *\d+ *\|[^|]+\| *(\S+@\S+) *\| *(\S+) *\|$/gm)];
  return { emails: rows.map((row) => row[1]), passwords: rows.map((row) => row[2]) };
}

function typedPasswords(commands: string[]): string[] {
  return commands
    .filter((_, index) => commands[index - 1] === 'tapOn: "Contraseña"')
    .map((command) => command.replace(/^inputText: "(.*)"$/, '$1'));
}

describe('todos los flujos', () => {
  it('cada flujo de primer nivel parte sin estado, inicia su propia sesión, no pulsa confirmar la transferencia y solo usa las credenciales de prueba', () => {
    const flows = topLevelFlows();
    const allFiles = [...flows, loginSubflow];
    const { emails, passwords } = readmeCredentials();

    expect(flows).toHaveLength(4);
    expect(emails).toHaveLength(3);
    for (const flow of flows) {
      const commands = commandsOf(flow);
      expect({ flow, start: commands.slice(0, 2) }).toEqual({ flow, start: startClean });
      expect(commands.filter((command) => /Confirmar transferencia|Enviar otra igual/.test(command))).toEqual([]);
    }
    for (const file of allFiles) {
      for (const [email] of flowText(file).matchAll(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g)) {
        expect(emails).toContain(email);
      }
      for (const password of typedPasswords(commandsOf(file))) {
        expect(passwords).toContain(password);
      }
    }
    expect(typedPasswords(commandsOf(loginSubflow))).toHaveLength(1);
  });
});
