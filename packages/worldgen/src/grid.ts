// Mundo de grilla: un `WorldStatic` chico y determinista para tests, bench y la suite de
// determinismo mientras no existe el worldgen real (P1.1). No es un planeta: provincias
// cuadradas con wrap E-O y habitabilidad en ondas.
import { math, rng } from '@ws/core';
import {
  hashWorldStatic,
  type ProvinceGraph,
  type WorldParams,
  type WorldStatic,
  validateWorldStatic,
} from './world-static';

export interface GridOptions {
  readonly seed: number;
  /** Provincias por fila (count; con wrap E-O) y filas (count). */
  readonly width: number;
  readonly height: number;
}

/** Área de cada provincia de la grilla (km2): ~100 × 100 km. */
const GRID_AREA_KM2 = 10_000;
/** Costo de cruzar entre provincias vecinas (days): ~100 km a ~25 km/día. */
const GRID_EDGE_DAYS = 4;
/** Frontera compartida (km). */
const GRID_BORDER_KM = 100;
const SUB_HABITABILITY = 1;

export function createGridWorld(options: GridOptions): WorldStatic {
  const { seed, width: w, height: h } = options;
  const n = w * h;
  const params: WorldParams = { seed, size: 'small', mapType: 'continents', landFraction: 1 };

  const area = new Float64Array(n + 1);
  const habitability = new Float32Array(n + 1);
  const coastal = new Uint8Array(n + 1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const id = y * w + x + 1;
      area[id] = GRID_AREA_KM2;
      const wave = math.sin((x * math.TAU) / w) * math.cos(((y + 0.5) * math.PI) / h - math.PI / 2);
      const jitter = rng.rngUniform(seed, rng.Streams.worldgenNoise, SUB_HABITABILITY, id, 0, 0);
      habitability[id] = math.clamp(0.5 + 0.35 * wave + 0.3 * (jitter - 0.5), 0.02, 1);
      coastal[id] = y === 0 || y === h - 1 ? 1 : 0;
    }
  }

  // Vecinos 4-conexos con wrap E-O, en orden creciente de id.
  const offsets = new Uint32Array(n + 2);
  const lists: number[][] = [];
  for (let id = 1; id <= n; id++) {
    const x = (id - 1) % w;
    const y = Math.floor((id - 1) / w);
    const set = new Set<number>();
    if (w > 1) {
      set.add(y * w + ((x + w - 1) % w) + 1);
      set.add(y * w + ((x + 1) % w) + 1);
    }
    if (y > 0) set.add((y - 1) * w + x + 1);
    if (y < h - 1) set.add((y + 1) * w + x + 1);
    set.delete(id);
    lists.push([...set].sort((a, b) => a - b));
  }
  let at = 0;
  for (let id = 1; id <= n; id++) {
    offsets[id] = at;
    at += lists[id - 1]?.length ?? 0;
  }
  offsets[n + 1] = at;
  const neighbors = new Uint32Array(at);
  lists.forEach((list, i) => {
    neighbors.set(list, offsets[i + 1] ?? 0);
  });
  const graph: ProvinceGraph = {
    offsets,
    neighbors,
    baseCost: new Float32Array(at).fill(GRID_EDGE_DAYS),
    borderLength: new Float32Array(at).fill(GRID_BORDER_KM),
  };

  const data = { params, provinces: { count: n, area, habitability, coastal }, graph };
  validateWorldStatic(data);
  return { ...data, hash: hashWorldStatic(data) };
}
