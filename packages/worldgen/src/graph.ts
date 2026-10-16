// Grafo de movimiento entre provincias (docs/model.md §4.4; CSR) y adyacencias marítimas. Aristas
// de tierra (frontera compartida, 4-conexa) y estrechos (agua de hasta `straitMaxCells` celdas
// entre dos provincias). Costo de referencia en días de viaje (M7).
import { PROVINCES } from './config';
import { Water } from './hydrology';
import { type Grid, wrapDx } from './raster';
import { EdgeKind, type ProvinceGraph, type SeaGraph } from './world-static';

const KEY = 65536;

/** Pares (a, b) con a < b → cantidad de lados de celda compartidos (0 = estrecho). */
function collectPairs(g: Grid, province: Uint16Array, water: Uint8Array): Map<number, number> {
  const { width, height } = g;
  const pairs = new Map<number, number>();
  const add = (a: number, b: number, edges: number) => {
    const key = a < b ? a * KEY + b : b * KEY + a;
    pairs.set(key, (pairs.get(key) ?? 0) + edges);
  };
  // Fronteras de tierra: pares derecha y abajo.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const a = province[i] ?? 0;
      if (a === 0) continue;
      const right = province[y * width + ((x + 1) % width)] ?? 0;
      if (right !== 0 && right !== a) add(a, right, 1);
      if (y + 1 < height) {
        const down = province[i + width] ?? 0;
        if (down !== 0 && down !== a) add(a, down, 1);
      }
    }
  }
  // Estrechos: rayos en las 4 direcciones sobre el agua.
  const DX = [1, -1, 0, 0];
  const DY = [0, 0, 1, -1];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = province[y * width + x] ?? 0;
      if (a === 0) continue;
      for (let d = 0; d < 4; d++) {
        for (let t = 1; t <= PROVINCES.straitMaxCells + 1; t++) {
          const ny = y + (DY[d] ?? 0) * t;
          if (ny < 0 || ny >= height) break;
          const j = ny * width + ((((x + (DX[d] ?? 0) * t) % width) + width) % width);
          if (water[j] === Water.land) {
            const b = province[j] ?? 0;
            if (t > 1 && b !== a && b !== 0) add(a, b, 0);
            break;
          }
        }
      }
    }
  }
  return pairs;
}

export function provinceGraph(
  g: Grid,
  cellKm: number,
  province: Uint16Array,
  water: Uint8Array,
  count: number,
  centroidX: Float32Array,
  centroidY: Float32Array,
  moveCost: Float32Array,
  ruggedness: Float32Array,
): ProvinceGraph {
  const pairs = collectPairs(g, province, water);
  const degree = new Uint32Array(count + 2);
  const keys = [...pairs.keys()].sort((p, q) => p - q);
  for (const key of keys) {
    const a = Math.floor(key / KEY);
    const b = key % KEY;
    degree[a] = (degree[a] ?? 0) + 1;
    degree[b] = (degree[b] ?? 0) + 1;
  }
  const offsets = new Uint32Array(count + 2);
  for (let p = 1; p <= count; p++) offsets[p + 1] = (offsets[p] ?? 0) + (degree[p] ?? 0);
  const edges = offsets[count + 1] ?? 0;
  const neighbors = new Uint32Array(edges);
  const kind = new Uint8Array(edges);
  const baseCost = new Float32Array(edges);
  const borderLength = new Float32Array(edges);
  const fill = offsets.slice();
  const put = (a: number, b: number, k: number, cost: number, border: number) => {
    const e = fill[a] ?? 0;
    neighbors[e] = b;
    kind[e] = k;
    baseCost[e] = cost;
    borderLength[e] = border;
    fill[a] = e + 1;
  };
  // Las claves van en orden (a, b) creciente: para cada provincia llegan primero sus vecinas
  // menores (pares (c, p), c < p) y después las mayores, así cada lista queda creciente.
  for (const key of keys) {
    const a = Math.floor(key / KEY);
    const b = key % KEY;
    const shared = pairs.get(key) ?? 0;
    const k = shared > 0 ? EdgeKind.land : EdgeKind.strait;
    const dx = wrapDx(g.width, centroidX[a] ?? 0, centroidX[b] ?? 0);
    const dy = (centroidY[b] ?? 0) - (centroidY[a] ?? 0);
    const km = Math.sqrt(dx * dx + dy * dy) * cellKm;
    const terrain =
      (((moveCost[a] ?? 1) + (moveCost[b] ?? 1)) / 2) *
      (1 + ((ruggedness[a] ?? 0) + (ruggedness[b] ?? 0)) / 2);
    const days =
      (Math.max(km, cellKm) / PROVINCES.travelKmPerDay) *
      terrain *
      (k === EdgeKind.strait ? PROVINCES.straitCost : 1);
    put(a, b, k, days, shared * cellKm);
    put(b, a, k, days, shared * cellKm);
  }
  return { offsets, neighbors, kind, baseCost, borderLength };
}

/** CSR desde una lista de pares únicos (from, to), ordenada por from y después por to. */
function csr(pairs: Set<number>, nodes: number): { start: Uint32Array; list: Uint16Array } {
  const sorted = [...pairs].sort((p, q) => p - q);
  const start = new Uint32Array(nodes + 2);
  for (const key of sorted) {
    const from = Math.floor(key / KEY);
    start[from + 1] = (start[from + 1] ?? 0) + 1;
  }
  for (let i = 1; i < start.length; i++) start[i] = (start[i] ?? 0) + (start[i - 1] ?? 0);
  const list = new Uint16Array(sorted.length);
  sorted.forEach((key, k) => {
    list[k] = key % KEY;
  });
  return { start, list };
}

export function seaGraph(
  g: Grid,
  province: Uint16Array,
  seaZone: Uint16Array,
  provinceCount: number,
  zoneCount: number,
): SeaGraph {
  const { width, height } = g;
  const touches = new Set<number>();
  const zoneLinks = new Set<number>();
  const link = (i: number, j: number) => {
    const p = province[i] ?? 0;
    const q = province[j] ?? 0;
    const zi = seaZone[i] ?? 0;
    const zj = seaZone[j] ?? 0;
    if (p !== 0 && zj !== 0) touches.add(p * KEY + zj);
    if (q !== 0 && zi !== 0) touches.add(q * KEY + zi);
    if (zi !== 0 && zj !== 0 && zi !== zj) {
      zoneLinks.add(zi * KEY + zj);
      zoneLinks.add(zj * KEY + zi);
    }
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      link(i, y * width + ((x + 1) % width));
      if (y + 1 < height) link(i, i + width);
    }
  }
  const pz = csr(touches, provinceCount);
  const zz = csr(zoneLinks, zoneCount);
  return {
    provinceZonesStart: pz.start,
    provinceZones: pz.list,
    zoneNeighborsStart: zz.start,
    zoneNeighbors: zz.list,
  };
}
