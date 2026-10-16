import { ENGINE_VERSION } from '@ws/core';
import { parseBenchArgs, runBench } from './bench';
import { formatRun, parseRunArgs, runSim } from './run';

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
  '  bench           Bench: primitivas del core y año sintético (P0.17)',
  '                  --json · --years N · --out archivo · --compare base.json · --tolerance 0.5',
  '  run             Corre una simulación headless: hashes por año y resumen (P1.0)',
  '                  --seed N · --grid 50x30 · --years N · --every 1000 · --json · --checks',
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
    case 'bench': {
      const { text, regressions } = runBench(parseBenchArgs(args.slice(1)));
      io.out(text);
      return Promise.resolve(regressions > 0 ? 1 : 0);
    }
    case 'run': {
      let options;
      try {
        options = parseRunArgs(args.slice(1));
      } catch (error) {
        io.err(error instanceof Error ? error.message : String(error));
        return Promise.resolve(1);
      }
      const report = runSim(options);
      io.out(options.json ? JSON.stringify(report, null, 2) : formatRun(report));
      return Promise.resolve(0);
    }
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
