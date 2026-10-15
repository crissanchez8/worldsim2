import { ENGINE_VERSION } from '@ws/core';

export interface Io {
  out: (line: string) => void;
  err: (line: string) => void;
}

const consoleIo: Io = {
  out: (line) => {
    process.stdout.write(`${line}\n`);
  },
  err: (line) => {
    process.stderr.write(`${line}\n`);
  },
};

const HELP = [
  'Uso: ws <comando> [opciones]',
  '',
  'Comandos:',
  '  --version, -v   Versión del motor',
  '  --help, -h      Esta ayuda',
].join('\n');

/** Ejecuta la CLI y devuelve el código de salida (0 = ok). */
export function main(args: readonly string[], io: Io = consoleIo): Promise<number> {
  const [command] = args;
  switch (command) {
    case '--version':
    case '-v':
      io.out(ENGINE_VERSION);
      return Promise.resolve(0);
    case undefined:
    case '--help':
    case '-h':
      io.out(HELP);
      return Promise.resolve(0);
    default:
      io.err(`Comando desconocido: ${command}\n\n${HELP}`);
      return Promise.resolve(1);
  }
}
