// Mundo estático (docs/model.md §4): la salida del worldgen, función pura de (seed, parámetros,
// ENGINE_VERSION). No va al snapshot (se regenera); su hash va en la cabecera del `.wsim` y en el
// estado (para que un snapshot no se cargue sobre otro mundo).
//
// Versión de P1.0: lo que la simulación necesita de las provincias y el grafo. P1.1 agrega el
// ráster y el resto de `ProvinceStatic` (clima, bioma, ríos) sin cambiar lo que ya existe.
import { hash, serialize } from '@ws/core';

/** Parámetros del mundo (`WorldParams`, docs/model.md §4.1). */
export interface WorldParams {
  /** u32 (`seedFromString` si viene de texto). */
  readonly seed: number;
  /** Clave de `WorldSizes` (content). */
  readonly size: string;
  /** Clave de `MapTypes` (content). */
  readonly mapType: string;
  /** Fracción de tierra objetivo (fraction). */
  readonly landFraction: number;
}

/**
 * Provincias de tierra (SoA). El índice es el id de provincia: ids 1..count, el 0 no se usa (en
 * el ráster, 0 = mar).
 */
export interface ProvinceStatic {
  readonly count: number;
  /** km2. */
  readonly area: Float64Array;
  /** score [0, 1]: densidad de semillas y atracción de población. */
  readonly habitability: Float32Array;
  /** flag. */
  readonly coastal: Uint8Array;
}

/**
 * Grafo de movimiento entre provincias de tierra, en CSR por id: los vecinos de `p` son
 * `neighbors[offsets[p] .. offsets[p + 1])`, en orden creciente de id. Simétrico.
 */
export interface ProvinceGraph {
  /** Largo count + 2 (offsets[0] = offsets[1] = 0). */
  readonly offsets: Uint32Array;
  readonly neighbors: Uint32Array;
  /** days: costo de referencia de cruzar la arista (M7). */
  readonly baseCost: Float32Array;
  /** km: largo de la frontera compartida. */
  readonly borderLength: Float32Array;
}

export interface WorldStatic {
  readonly params: WorldParams;
  readonly provinces: ProvinceStatic;
  readonly graph: ProvinceGraph;
  /** hash64 del contenido (16 hex). */
  readonly hash: string;
}

export type WorldStaticData = Omit<WorldStatic, 'hash'>;

/** Hash del mundo estático: parámetros + todos los arrays, en un orden fijo. */
export function hashWorldStatic(world: WorldStaticData): string {
  const w = new serialize.ByteWriter();
  const { params, provinces: p, graph: g } = world;
  w.u32(params.seed);
  w.str(params.size);
  w.str(params.mapType);
  w.f64(params.landFraction);
  w.u32(p.count);
  for (const array of [p.area, p.habitability, p.coastal, g.offsets, g.neighbors]) {
    w.u32(array.length);
    w.numeric(array, array.length);
  }
  for (const array of [g.baseCost, g.borderLength]) {
    w.u32(array.length);
    w.numeric(array, array.length);
  }
  return hash.hash64(w.finish());
}

/** Vecinos de una provincia (vista sin copia). */
export function neighborsOf(graph: ProvinceGraph, province: number): Uint32Array {
  return graph.neighbors.subarray(graph.offsets[province] ?? 0, graph.offsets[province + 1] ?? 0);
}

/** Valida la forma del mundo (tamaños, ids, simetría del grafo). Lanza con el primer error. */
export function validateWorldStatic(world: WorldStaticData): void {
  const { provinces: p, graph: g } = world;
  const n = p.count;
  if (!Number.isInteger(n) || n < 1 || n > 0xffff) throw new Error(`provincias: count ${n}`);
  for (const [name, array] of [
    ['area', p.area],
    ['habitability', p.habitability],
    ['coastal', p.coastal],
  ] as const) {
    if (array.length !== n + 1) throw new Error(`provincias.${name}: largo ${array.length}`);
  }
  if (g.offsets.length !== n + 2) throw new Error(`grafo: offsets de largo ${g.offsets.length}`);
  const edges = g.offsets[n + 1] ?? 0;
  if (g.neighbors.length !== edges || g.baseCost.length !== edges) {
    throw new Error('grafo: largos inconsistentes');
  }
  if (g.borderLength.length !== edges) throw new Error('grafo: borderLength inconsistente');
  for (let a = 1; a <= n; a++) {
    let prev = 0;
    for (const b of neighborsOf(g, a)) {
      if (b < 1 || b > n || b === a) throw new Error(`grafo: arista ${a}→${b} inválida`);
      if (b <= prev) throw new Error(`grafo: vecinos de ${a} no crecientes`);
      prev = b;
      if (!neighborsOf(g, b).includes(a)) throw new Error(`grafo: ${a}→${b} sin vuelta`);
    }
  }
}
