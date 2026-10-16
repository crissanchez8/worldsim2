// Batería de determinismo (P1.0, reescrita del spike C sobre el motor real). El mismo código
// corre en Node (referencia) y en cada navegador; todo resultado se reduce a hashes de sus bits
// para comparar exacto.
import { CONTENT_HASH } from '@ws/content';
import { ENGINE_VERSION, hash, math, rng, serialize } from '@ws/core';
import { Sim, STATE_VERSION, yearHash } from '@ws/sim';
import { createGridWorld, type WorldStatic } from '@ws/worldgen';

const SAMPLES = 4096;
type Unary = (x: number) => number;
type Binary = (a: number, b: number) => number;

/** Dominio de cada función: transforma un uniforme [0, 1) en un argumento. */
const pow10 = (u: number, lo: number, hi: number) => math.pow(10, lo + (hi - lo) * u);
const span = (u: number, lo: number, hi: number) => lo + (hi - lo) * u;

const UNARY: readonly [string, Unary, (u: number) => number][] = [
  ['exp', math.exp, (u) => span(u, -700, 700)],
  ['expm1', math.expm1, (u) => span(u, -5, 5)],
  ['log', math.log, (u) => pow10(u, -300, 300)],
  ['log1p', math.log1p, (u) => span(u, -0.99, 10)],
  ['log2', math.log2, (u) => pow10(u, -300, 300)],
  ['log10', math.log10, (u) => pow10(u, -300, 300)],
  ['sin', math.sin, (u) => span(u, -1e5, 1e5)],
  ['cos', math.cos, (u) => span(u, -1e5, 1e5)],
  ['tan', math.tan, (u) => span(u, -10, 10)],
  ['atan', math.atan, (u) => span(u, -1e6, 1e6)],
  ['asin', math.asin, (u) => span(u, -1, 1)],
  ['acos', math.acos, (u) => span(u, -1, 1)],
  ['tanh', math.tanh, (u) => span(u, -25, 25)],
  ['sigmoid', math.sigmoid, (u) => span(u, -50, 50)],
  // Única operación no trivial de Math permitida en el motor (exacta por IEEE-754).
  ['sqrt', (x) => Math.sqrt(x), (u) => pow10(u, -300, 300)],
];
const BINARY: readonly [string, Binary, (u: number) => number, (u: number) => number][] = [
  ['pow', math.pow, (u) => pow10(u, -3, 3), (u) => span(u, -20, 20)],
  ['atan2', math.atan2, (u) => span(u, -1e3, 1e3), (u) => span(u, -1e3, 1e3)],
  ['hypot', math.hypot, (u) => pow10(u, -200, 200), (u) => pow10(u, -200, 200)],
];

function uniformAt(sub: number, i: number, k: number): number {
  return rng.rngUniform(1, rng.Streams.test, sub, i, 1, k);
}

/** Hash de los bits de cada función de core/math (y de Math.sqrt) sobre 4.096 argumentos. */
export function mathBattery(): Record<string, string> {
  const out: Record<string, string> = {};
  let sub = 100;
  for (const [name, f, domain] of UNARY) {
    const w = new serialize.ByteWriter();
    for (let i = 0; i < SAMPLES; i++) w.f64(f(domain(uniformAt(sub, i, 0))));
    out[name] = hash.hash64(w.finish());
    sub++;
  }
  for (const [name, f, da, db] of BINARY) {
    const w = new serialize.ByteWriter();
    for (let i = 0; i < SAMPLES; i++) w.f64(f(da(uniformAt(sub, i, 0)), db(uniformAt(sub, i, 1))));
    out[name] = hash.hash64(w.finish());
    sub++;
  }
  return out;
}

/** Hash de 4 × 100 × 4 × 32 valores del RNG (uint32 y uniform) en varios streams y años. */
export function rngBattery(): string {
  const w = new serialize.ByteWriter();
  const streams = [
    rng.Streams.test,
    rng.Streams.demography,
    rng.Streams.military,
    rng.Streams.naming,
  ];
  for (const stream of streams) {
    for (let entity = 0; entity < 100; entity++) {
      for (const year of [-12000, -1, 1, 1900]) {
        const d = rng.createRng(42).stream(stream).at(entity, year);
        for (let k = 0; k < 32; k++) {
          w.u32(d.uint32());
          w.f64(d.uniform());
        }
      }
    }
  }
  return hash.hash64(w.finish());
}

/**
 * Escenario de la suite: el mundo sobre el que corre la simulación. Hasta el worldgen real
 * (P1.1) es la grilla de 1.500 provincias; después, el mundo chico generado de verdad.
 */
export const SCENARIO = { seed: 1, grid: [50, 30] } as const;

export function scenarioWorld(): WorldStatic {
  const [width, height] = SCENARIO.grid;
  return createGridWorld({ seed: SCENARIO.seed, width, height });
}

/** Corre la simulación real del escenario y entrega el hash de cada año. */
export function runYears(
  world: WorldStatic,
  years: number,
  onYear: (index: number, hash: string) => void,
): string {
  const sim = Sim.create(world);
  let last = sim.hash();
  for (let i = 0; i < years && !sim.finished; i++) {
    last = yearHash(sim, sim.step());
    onYear(i, last);
  }
  return last;
}

/** Años de la corrida completa del escenario. */
export function fullRunYears(world: WorldStatic): number {
  const sim = Sim.create(world);
  return sim.endYear - sim.year; // sin año 0: del −12000 al 1900 hay 13.900 años
}

export interface Expected {
  readonly engine: string;
  readonly stateVersion: string;
  readonly generatedBy: string;
  readonly contentHash: string;
  readonly worldHash: string;
  readonly years: number;
  readonly math: Record<string, string>;
  readonly rng: string;
  readonly yearHashes: readonly string[];
}

/** Las verificaciones que no son la corrida (rápidas): contenido, mundo, math y RNG. */
export function staticChecks(world: WorldStatic) {
  return {
    engine: ENGINE_VERSION,
    stateVersion: STATE_VERSION,
    contentHash: CONTENT_HASH,
    worldHash: world.hash,
    math: mathBattery(),
    rng: rngBattery(),
  };
}
