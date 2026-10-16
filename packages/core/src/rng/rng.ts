// RNG por contador (ADR-002): cada número es una función pura de
//   (seed del mundo, stream, sub-stream, entidad, año, contador k)
// No hay estado global ni dependencia del orden en que corren los sistemas. Núcleo: XXH32 de
// 6 palabras; dos carriles (seeds de XXH32 distintas) dan 64 bits por paso.
import { utf8, xxh32, xxh32Words6 } from '../hash';
import { log } from '../math';
import type { StreamId } from './streams';

const LANE_0 = 0;
const LANE_1 = 0x9e3779b9;
const TWO_26 = 67108864;
const TWO_53 = 9007199254740992;

/** Seed del mundo: uint32. */
export type Seed = number;

/** Seed reproducible a partir de un texto (p. ej. el que escribe el usuario). */
export function seedFromString(text: string): Seed {
  return xxh32(utf8(text));
}

function toWord(value: number, what: string): number {
  if (!Number.isInteger(value)) throw new Error(`rng: ${what} debe ser entero (recibió ${value})`);
  return value >>> 0;
}

/** Acceso sin asignaciones para lazos calientes: uint32 del paso k (carril 0). */
export function rngUint32(
  seed: Seed,
  stream: StreamId,
  sub: number,
  entity: number,
  year: number,
  k: number,
): number {
  return xxh32Words6(LANE_0, seed, stream, sub, entity, year >>> 0, k);
}

/** Acceso sin asignaciones: uniforme en [0, 1) con 53 bits, del paso k. */
export function rngUniform(
  seed: Seed,
  stream: StreamId,
  sub: number,
  entity: number,
  year: number,
  k: number,
): number {
  const y = year >>> 0;
  const hi = xxh32Words6(LANE_0, seed, stream, sub, entity, y, k) >>> 5;
  const lo = xxh32Words6(LANE_1, seed, stream, sub, entity, y, k) >>> 6;
  return (hi * TWO_26 + lo) / TWO_53;
}

/**
 * Secuencia de números para una (entidad, año) dentro de un stream. Es un cursor local: el
 * contador k avanza con cada pedido. Dos `Draw` con las mismas coordenadas dan la misma
 * secuencia.
 */
export class Draw {
  private readonly seed: number;
  private readonly stream: number;
  private readonly sub: number;
  private readonly entity: number;
  private readonly year: number;
  private k = 0;

  constructor(seed: number, stream: number, sub: number, entity: number, year: number) {
    this.seed = seed;
    this.stream = stream;
    this.sub = sub;
    this.entity = entity;
    this.year = year;
  }

  /** Entero uniforme en [0, 2^32). */
  uint32(): number {
    return xxh32Words6(LANE_0, this.seed, this.stream, this.sub, this.entity, this.year, this.k++);
  }

  /** Uniforme en [0, 1) con resolución de 2^−53. */
  uniform(): number {
    const k = this.k++;
    const hi = xxh32Words6(LANE_0, this.seed, this.stream, this.sub, this.entity, this.year, k);
    const lo = xxh32Words6(LANE_1, this.seed, this.stream, this.sub, this.entity, this.year, k);
    return ((hi >>> 5) * TWO_26 + (lo >>> 6)) / TWO_53;
  }

  /** Entero uniforme en [0, n), con 1 ≤ n ≤ 2^32 (sesgo ≤ n/2^53, despreciable). */
  int(n: number): number {
    if (!Number.isInteger(n) || n < 1 || n > 4294967296) {
      throw new Error(`rng.int: n debe ser entero en [1, 2^32] (recibió ${n})`);
    }
    return Math.floor(this.uniform() * n);
  }

  /** Entero uniforme en [min, max], ambos incluidos. */
  intBetween(min: number, max: number): number {
    return min + this.int(max - min + 1);
  }

  /** Real uniforme en [a, b). */
  range(a: number, b: number): number {
    return a + (b - a) * this.uniform();
  }

  /** true con probabilidad p. */
  chance(p: number): boolean {
    return this.uniform() < p;
  }

  /** Normal(mean, sd) por el método polar de Marsaglia (usa core/math, no Math.log). */
  normal(mean = 0, sd = 1): number {
    let u: number;
    let s: number;
    do {
      u = 2 * this.uniform() - 1;
      const v = 2 * this.uniform() - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);
    return mean + sd * u * Math.sqrt((-2 * log(s)) / s);
  }

  /** Índice elegido con probabilidad proporcional a su peso (pesos ≥ 0, total > 0). */
  weighted(weights: readonly number[]): number {
    let total = 0;
    for (const w of weights) {
      if (!(w >= 0) || w === Infinity) throw new Error(`rng.weighted: peso inválido ${w}`);
      total += w;
    }
    if (!(total > 0)) throw new Error('rng.weighted: la suma de pesos debe ser > 0');
    const target = this.uniform() * total;
    let acc = 0;
    let last = -1;
    for (let i = 0; i < weights.length; i++) {
      const w = weights[i] ?? 0;
      if (w === 0) continue;
      acc += w;
      last = i;
      if (target < acc) return i;
    }
    return last; // redondeo: target ≥ acc final por un ulp
  }

  /** Un elemento uniforme de la lista (no vacía). */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('rng.pick: lista vacía');
    return items[this.int(items.length)] as T;
  }

  /** Fisher–Yates en el lugar. Devuelve el mismo array. */
  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      const tmp = items[i] as T;
      items[i] = items[j] as T;
      items[j] = tmp;
    }
    return items;
  }
}

export class Stream {
  private readonly seed: number;
  private readonly id: StreamId;
  private readonly subId: number;

  constructor(seed: number, id: StreamId, subId: number) {
    this.seed = seed;
    this.id = id;
    this.subId = subId;
  }

  /** Sub-stream (0..2^32−1) para separar usos dentro de un mismo sistema. */
  sub(subId: number): Stream {
    return new Stream(this.seed, this.id, toWord(subId, 'sub'));
  }

  /** Cursor de números para una entidad (id, o 0 si es global) en un año dado. */
  at(entity: number, year: number): Draw {
    // Años negativos (a.C.) se codifican en complemento a dos: −12000 → 0xFFFFD120.
    return new Draw(this.seed, this.id, this.subId, toWord(entity, 'entity'), toWord(year, 'year'));
  }
}

export class Rng {
  readonly seed: Seed;

  constructor(seed: Seed) {
    this.seed = toWord(seed, 'seed');
  }

  stream(id: StreamId): Stream {
    return new Stream(this.seed, id, 0);
  }
}

export function createRng(seed: Seed): Rng {
  return new Rng(seed);
}
