// Regiones del ráster (provincias y zonas marítimas, P1.1; DEVELOPMENT_PLAN §12.10): semillas por
// "dart throwing" con radio variable (Poisson ponderado) y crecimiento por costo mínimo
// (Dijkstra multi-fuente). Las masas sin semilla (islas) reciben la suya: toda celda transitable
// queda asignada y cada región es conexa.
import type { rng } from '@ws/core';
import { PROVINCES } from './config';
import { MinHeap } from './heap';
import { D8_DX, D8_DY, type Grid, wrapDx } from './raster';

export interface SeedOptions {
  /** Regiones objetivo (count). */
  readonly target: number;
  /** Celdas elegibles. */
  readonly candidates: Int32Array;
  /** Peso por celda en [0, 1]: probabilidad de aceptar y densidad (más peso, regiones más chicas). */
  readonly weight?: Float32Array;
  /** Stream (con su sub ya elegido: `sub` reemplaza, no anida). Se usa `at(intento, 0)`. */
  readonly stream: rng.Stream;
}

/** Peso mínimo de aceptación (fraction): las tierras pobres también reciben semillas. */
const MIN_ACCEPT = 0.05;
/** Escala mínima del radio antes de rendirse (fraction). */
const MIN_SCALE = 0.25;

/** Semillas bien espaciadas (celdas, en orden creciente). */
export function placeSeeds(g: Grid, opts: SeedOptions): Int32Array {
  const { width, height } = g;
  const { candidates, weight, target, stream } = opts;
  if (candidates.length === 0 || target <= 0) return new Int32Array(0);
  const r0 = Math.sqrt(candidates.length / target / Math.PI);
  const gain = weight ? PROVINCES.seedDensityGain : 0;
  const radius = (c: number) => r0 * (1 + gain * (0.5 - (weight?.[c] ?? 0.5)));
  let scale = PROVINCES.seedRadiusStart;
  const maxR = r0 * (1 + 0.5 * gain) * scale;
  // Cubetas de lado ≥ maxR (división exacta del ancho, por el wrap).
  const bw = Math.max(1, Math.floor(width / maxR));
  const bh = Math.max(1, Math.floor(height / maxR));
  const bucketOf = (c: number) => {
    const x = c % width;
    const y = (c - x) / width;
    return [
      Math.min(bw - 1, Math.floor((x * bw) / width)),
      Math.min(bh - 1, Math.floor((y * bh) / height)),
    ] as const;
  };
  const buckets: number[][] = Array.from({ length: bw * bh }, () => []);
  const seeds: number[] = [];
  let failures = 0;
  const maxAttempts = target * 400;
  for (let attempt = 0; attempt < maxAttempts && seeds.length < target; attempt++) {
    if (failures > PROVINCES.seedPatience) {
      scale *= PROVINCES.seedRadiusShrink;
      failures = 0;
      if (scale < MIN_SCALE) break;
    }
    const d = stream.at(attempt, 0);
    const c = candidates[d.int(candidates.length)] ?? 0;
    if (weight && d.uniform() > Math.max(MIN_ACCEPT, weight[c] ?? 0)) {
      failures++;
      continue;
    }
    const cx = c % width;
    const cy = (c - cx) / width;
    const rc = radius(c);
    const [bx, by] = bucketOf(c);
    let ok = true;
    const columns = bw >= 3 ? [bx - 1, bx, bx + 1] : Array.from({ length: bw }, (_, k) => k);
    for (let dy = -1; dy <= 1 && ok; dy++) {
      const yy = by + dy;
      if (yy < 0 || yy >= bh) continue;
      for (const col of columns) {
        const xx = ((col % bw) + bw) % bw;
        for (const s of buckets[yy * bw + xx] ?? []) {
          const sx = s % width;
          const sy = (s - sx) / width;
          const dx = wrapDx(width, sx, cx);
          const sep = (scale * (rc + radius(s))) / 2;
          if (dx * dx + (cy - sy) * (cy - sy) < sep * sep) {
            ok = false;
            break;
          }
        }
        if (!ok) break;
      }
    }
    if (!ok) {
      failures++;
      continue;
    }
    failures = 0;
    seeds.push(c);
    buckets[by * bw + bx]?.push(c);
  }
  return Int32Array.from(seeds).sort((a, b) => a - b);
}

/**
 * Fusiona las regiones de menos de `minCells` celdas con su vecina 4-conexa de frontera más larga
 * (a igual frontera, la de id menor), en orden de id y en pasadas hasta que no quede ninguna con
 * vecinas; después renumera 1..k conservando el orden. Las que no tienen vecinas (islas) quedan.
 * Devuelve la cantidad nueva de regiones.
 */
export function mergeSmallRegions(
  g: Grid,
  owner: Uint16Array,
  count: number,
  minCells: number,
): number {
  const { width, height } = g;
  const alias = new Uint32Array(count + 1);
  for (let p = 0; p <= count; p++) alias[p] = p;
  const find = (start: number): number => {
    let p = start;
    while ((alias[p] ?? p) !== p) {
      const up = alias[p] ?? p;
      alias[p] = alias[up] ?? up;
      p = up;
    }
    return p;
  };
  const MAX_PASSES = 4;
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const cells = new Uint32Array(count + 1);
    for (const id of owner) if (id !== 0) cells[find(id)] = (cells[find(id)] ?? 0) + 1;
    const small: number[] = [];
    const isSmall = new Uint8Array(count + 1);
    for (let p = 1; p <= count; p++) {
      const c = cells[p] ?? 0;
      if (c > 0 && c < minCells) {
        small.push(p);
        isSmall[p] = 1;
      }
    }
    if (small.length === 0) break;
    const shared = new Map<number, Map<number, number>>();
    const touch = (p: number, j: number) => {
      const q = find(owner[j] ?? 0);
      if (q === 0 || q === p) return;
      const m = shared.get(p) ?? new Map<number, number>();
      m.set(q, (m.get(q) ?? 0) + 1);
      shared.set(p, m);
    };
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const p = find(owner[i] ?? 0);
        if (p === 0 || !isSmall[p]) continue;
        touch(p, y * width + ((x + 1) % width));
        touch(p, y * width + ((x + width - 1) % width));
        if (y > 0) touch(p, i - width);
        if (y + 1 < height) touch(p, i + width);
      }
    }
    let merged = 0;
    for (const p of small) {
      let best = 0;
      let bestEdges = 0;
      for (const [q, edges] of shared.get(p) ?? []) {
        if (edges > bestEdges || (edges === bestEdges && q < best)) {
          best = q;
          bestEdges = edges;
        }
      }
      const target = find(best);
      if (target === 0 || target === find(p)) continue;
      alias[find(p)] = target;
      merged++;
    }
    if (merged === 0) break;
  }
  const newId = new Uint16Array(count + 1);
  let next = 0;
  for (let p = 1; p <= count; p++) if (find(p) === p) newId[p] = ++next;
  for (let i = 0; i < owner.length; i++) {
    const id = owner[i] ?? 0;
    if (id !== 0) owner[i] = newId[find(id)] ?? 0;
  }
  return next;
}

/** Costo de pasar de la celda `from` a su vecina D8 `to` (dirección k). */
export type StepCost = (from: number, to: number, k: number) => number;

/**
 * Crecimiento por costo mínimo desde varias semillas a la vez. `owner` recibe el id de región
 * (`firstId` + índice de la semilla) en cada celda transitable alcanzada. A igual costo gana la
 * semilla que llegó primero según el orden total del montículo (costo, celda).
 */
export function growRegions(
  g: Grid,
  seeds: Int32Array,
  firstId: number,
  owner: Uint16Array,
  passable: Uint8Array,
  cost: StepCost,
  dist: Float64Array,
): void {
  const { width, height } = g;
  const heap = new MinHeap(seeds.length * 4);
  seeds.forEach((c, k) => {
    dist[c] = 0;
    owner[c] = firstId + k;
    heap.push(c, 0);
  });
  while (heap.size > 0) {
    const key = heap.peekKey();
    const c = heap.pop();
    if (key > (dist[c] ?? 0)) continue; // entrada vieja (sin decrease-key)
    const x = c % width;
    const y = (c - x) / width;
    for (let k = 0; k < 8; k++) {
      const ny = y + (D8_DY[k] ?? 0);
      if (ny < 0 || ny >= height) continue;
      const j = ny * width + ((x + (D8_DX[k] ?? 0) + width) % width);
      if (!passable[j]) continue;
      const nd = key + cost(c, j, k);
      if (nd < (dist[j] ?? Infinity)) {
        dist[j] = nd;
        owner[j] = owner[c] ?? 0;
        heap.push(j, nd);
      }
    }
  }
}

/**
 * Asigna regiones a todo lo transitable: crece desde las semillas y después da una semilla a
 * cada componente que quedó sin región (la celda de más peso; a igual peso, la de índice menor).
 * Devuelve la cantidad de regiones (ids 1..count).
 */
export function assignRegions(
  g: Grid,
  seeds: Int32Array,
  owner: Uint16Array,
  passable: Uint8Array,
  cost: StepCost,
  weight?: Float32Array,
): number {
  const { width, height } = g;
  const n = width * height;
  const dist = new Float64Array(n).fill(Infinity);
  growRegions(g, seeds, 1, owner, passable, cost, dist);
  let count = seeds.length;
  const stack: number[] = [];
  const seen = new Uint8Array(n);
  for (let start = 0; start < n; start++) {
    if (!passable[start] || owner[start] !== 0 || seen[start]) continue;
    // Componente sin región: la recorre para elegir su semilla.
    let best = start;
    seen[start] = 1;
    stack.push(start);
    while (stack.length > 0) {
      const i = stack.pop() ?? 0;
      if (
        (weight?.[i] ?? 0) > (weight?.[best] ?? 0) ||
        ((weight?.[i] ?? 0) === (weight?.[best] ?? 0) && i < best)
      ) {
        best = i;
      }
      const x = i % width;
      const y = (i - x) / width;
      for (let k = 0; k < 8; k++) {
        const ny = y + (D8_DY[k] ?? 0);
        if (ny < 0 || ny >= height) continue;
        const j = ny * width + ((x + (D8_DX[k] ?? 0) + width) % width);
        if (!passable[j] || owner[j] !== 0 || seen[j]) continue;
        seen[j] = 1;
        stack.push(j);
      }
    }
    if (count >= 0xffff) throw new Error('worldgen: más de 65.535 regiones');
    growRegions(g, Int32Array.of(best), count + 1, owner, passable, cost, dist);
    count++;
  }
  return count;
}
