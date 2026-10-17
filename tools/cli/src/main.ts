import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { ENGINE_VERSION } from '@ws/core';
import { parseBenchArgs, runBench } from './bench';
import { parseHealthArgs, runHealth, writeHealth } from './health';
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
  '  run             Genera un mundo y lo simula headless: hashes por año y resumen',
  '                  --seed N · --size small|medium · --map continents|pangaea|archipelago',
  '                  --land 0.3 · --grid AxB (grilla de prueba) · --years N · --every 1000',
  '                  --json · --checks · --wsim archivo (graba la historia y la mide)',
  '  health          Salud histórica (P1.8): N seeds en paralelo contra el Apéndice A',
  '                  --seeds 10 · --seed-list 1,2 · --size · --map · --land · --sample 100',
  '                  --years N · --workers N · --out out/health · --compare base.json · --save base.json',
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
    case 'health':
      return health(args.slice(1), io);
    case 'run': {
      let options;
      try {
        options = parseRunArgs(args.slice(1));
      } catch (error) {
        io.err(error instanceof Error ? error.message : String(error));
        return Promise.resolve(1);
      }
      const { report, wsim } = runSim(options);
      if (wsim && options.wsim !== undefined) {
        mkdirSync(dirname(options.wsim), { recursive: true });
        writeFileSync(options.wsim, wsim);
      }
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

async function health(args: readonly string[], io: Io): Promise<number> {
  let options;
  try {
    options = parseHealthArgs(args);
  } catch (error) {
    io.err(error instanceof Error ? error.message : String(error));
    return 1;
  }
  const report = await runHealth(options, io.out);
  io.out(writeHealth(report, options));
  io.out(`reporte en ${options.out}/report.{md,html,json}`);
  return report.summary.failures > 0 ? 1 : 0;
}
