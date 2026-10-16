// Genera la referencia de Node: public/expected.json (la página y Playwright comparan contra
// esto). Años: argumento o DETERMINISM_YEARS (por defecto, la corrida completa).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { type Expected, fullRunYears, runYears, scenarioWorld, staticChecks } from './battery';

const world = scenarioWorld();
const arg = process.argv[2] ?? process.env['DETERMINISM_YEARS'];
// Vacío o ausente = corrida completa (el CI lo deja vacío fuera de los PR).
const years = arg === undefined || arg === '' ? fullRunYears(world) : Number(arg);
const yearHashes: string[] = [];
const t0 = performance.now();
runYears(world, years, (_i, h) => yearHashes.push(h));
const expected: Expected = {
  ...staticChecks(world),
  generatedBy: `node ${process.version}`,
  years: yearHashes.length,
  yearHashes,
};
const out = resolve(import.meta.dirname, '../public/expected.json');
// En un clon limpio public/ no existe: su único archivo está ignorado (L-014).
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(expected));
console.log(
  `expected.json: ${expected.years} años en ${((performance.now() - t0) / 1000).toFixed(1)} s · final ${yearHashes.at(-1) ?? '—'}`,
);
