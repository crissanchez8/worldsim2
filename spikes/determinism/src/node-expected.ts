// Genera la referencia de Node: public/expected.json (la página y Playwright comparan contra
// esto). Años: argumento o DETERMINISM_YEARS (por defecto 14.000).
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ENGINE_VERSION } from '@ws/core';
import { type Expected, mathBattery, rngBattery, runYears } from './battery';

const years = Number(process.argv[2] ?? process.env['DETERMINISM_YEARS'] ?? 14000);
const yearHashes: string[] = [];
const t0 = Date.now();
runYears(years, (_i, h) => yearHashes.push(h));
const expected: Expected = {
  engine: ENGINE_VERSION,
  generatedBy: `node ${process.version}`,
  years,
  math: mathBattery(),
  rng: rngBattery(),
  yearHashes,
};
writeFileSync(resolve(import.meta.dirname, '../public/expected.json'), JSON.stringify(expected));
console.log(
  `expected.json: ${years} años en ${((Date.now() - t0) / 1000).toFixed(1)} s · final ${yearHashes.at(-1) ?? '—'}`,
);
