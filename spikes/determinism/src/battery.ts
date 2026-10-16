// Batería de determinismo (spike C, P0.15). El mismo código corre en Node (referencia) y en
// cada navegador; todo resultado se reduce a hashes de sus bits para comparar exacto.
import { math, rng, serialize } from '@ws/core';
import { core } from './core-alias';
import { createSim, DEFAULT_CONFIG, yearHash } from '@ws/spike-worker/sim';

const { ByteWriter } = serialize;
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
  ['sqrt', core.sqrt, (u) => pow10(u, -300, 300)],
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
    const w = new ByteWriter();
    for (let i = 0; i < SAMPLES; i++) w.f64(f(domain(uniformAt(sub, i, 0))));
    out[name] = core.hash64(w.finish());
    sub++;
  }
  for (const [name, f, da, db] of BINARY) {
    const w = new ByteWriter();
    for (let i = 0; i < SAMPLES; i++) w.f64(f(da(uniformAt(sub, i, 0)), db(uniformAt(sub, i, 1))));
    out[name] = core.hash64(w.finish());
    sub++;
  }
  return out;
}

/** Hash de 4 × 100 × 4 × 64 valores del RNG (uint32 y uniform) en varios streams y años. */
export function rngBattery(): string {
  const w = new ByteWriter();
  const streams = [
    rng.Streams.test,
    rng.Streams.demography,
    rng.Streams.military,
    rng.Streams.spike,
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
  return core.hash64(w.finish());
}

/** Corre la simulación del spike B y entrega el hash de cada año. */
export function runYears(years: number, onYear: (index: number, hash: string) => void): string {
  const sim = createSim(DEFAULT_CONFIG);
  let last = sim.stateHash();
  for (let i = 0; i < years; i++) {
    const result = sim.step();
    last = yearHash(sim, result);
    onYear(i, last);
  }
  return last;
}

export interface Expected {
  readonly engine: string;
  readonly generatedBy: string;
  readonly years: number;
  readonly math: Record<string, string>;
  readonly rng: string;
  readonly yearHashes: readonly string[];
}
