// Hidrología v1 (P1.1, DEVELOPMENT_PLAN §12.5): relleno de depresiones por prioridad
// (priority-flood + ε, Barnes 2014) desde la costa; la celda que inunda a otra es su desagüe, así
// que el árbol de drenaje sale gratis y todo río termina en el mar (o atraviesa un lago y sigue).
// Caudal = escorrentía acumulada aguas abajo, en m³/s. P3 agrega lagos endorreicos y Strahler.
import { HYDROLOGY, PLANET, RELIEF } from './config';
import { MinHeap } from './heap';
import { D8_DX, D8_DY, type Grid, NO_DIR } from './raster';

/** Tipo de agua de una celda. */
export const Water = { land: 0, ocean: 1, lake: 2 } as const;

export interface Hydrology {
  /** `Water` por celda. */
  readonly water: Uint8Array;
  /** Caudal (m3_per_s): escorrentía de la celda + todo lo que llega de aguas arriba. */
  readonly flow: Float32Array;
  /** Desagüe D8 de cada celda de tierra o lago (0–7, `D8_DX/DY`), NO_DIR si no tiene. */
  readonly flowDir: Uint8Array;
}

/** Escorrentía (fraction de la precipitación): más evaporación con más calor. */
export function runoffCoefficient(temperatureC: number): number {
  const c = HYDROLOGY.runoffBase - HYDROLOGY.runoffPerC * temperatureC;
  return Math.min(HYDROLOGY.runoffMax, Math.max(HYDROLOGY.runoffMin, c));
}

/**
 * Calcula el agua y el drenaje. Modifica `elevation` en tierra: queda la superficie rellenada
 * (los lagos, a nivel de su desborde; las depresiones chicas, aplanadas con pendiente ε), así
 * ningún tramo de río sube.
 */
export function computeHydrology(
  g: Grid,
  elevation: Float32Array,
  temperature: Float32Array,
  precipitation: Float32Array,
  cellKm: number,
): Hydrology {
  const { width, height } = g;
  const n = width * height;
  const water = new Uint8Array(n);
  for (let i = 0; i < n; i++) if ((elevation[i] ?? 0) < 0) water[i] = Water.ocean;

  const filled = Float64Array.from(elevation);
  const flowDir = new Uint8Array(n).fill(NO_DIR);
  const visited = new Uint8Array(n);
  const order = new Int32Array(n);
  let popped = 0;
  const heap = new MinHeap(n >> 4);

  // Semillas: tierra que toca el océano; su desagüe es esa celda de océano (desembocadura).
  for (let i = 0; i < n; i++) {
    if (water[i] !== Water.land) continue;
    const x = i % width;
    const y = (i - x) / width;
    for (let k = 0; k < 8; k++) {
      const ny = y + (D8_DY[k] ?? 0);
      if (ny < 0 || ny >= height) continue;
      const j = ny * width + ((x + (D8_DX[k] ?? 0) + width) % width);
      if (water[j] !== Water.ocean) continue;
      flowDir[i] = k;
      visited[i] = 1;
      heap.push(i, filled[i] ?? 0);
      break;
    }
  }

  const flood = () => {
    while (heap.size > 0) {
      const c = heap.pop();
      order[popped++] = c;
      const x = c % width;
      const y = (c - x) / width;
      const fc = filled[c] ?? 0;
      for (let k = 0; k < 8; k++) {
        const ny = y + (D8_DY[k] ?? 0);
        if (ny < 0 || ny >= height) continue;
        const j = ny * width + ((x + (D8_DX[k] ?? 0) + width) % width);
        if (visited[j] || water[j] === Water.ocean) continue;
        visited[j] = 1;
        filled[j] = Math.max(elevation[j] ?? 0, fc + HYDROLOGY.fillEpsilonM);
        flowDir[j] = (k + 4) % 8; // hacia la celda que la inundó
        heap.push(j, filled[j] ?? 0);
      }
    }
  };
  flood();
  // Tierra sin costa (un mundo sin océano): se drena desde su punto más bajo.
  for (;;) {
    let lowest = -1;
    for (let i = 0; i < n; i++) {
      if (water[i] === Water.land && !visited[i]) {
        if (lowest < 0 || (elevation[i] ?? 0) < (elevation[lowest] ?? 0)) lowest = i;
      }
    }
    if (lowest < 0) break;
    visited[lowest] = 1;
    heap.push(lowest, filled[lowest] ?? 0);
    flood();
  }

  // Lagos y superficie rellenada.
  for (let i = 0; i < n; i++) {
    if (water[i] === Water.ocean) continue;
    const f = filled[i] ?? 0;
    if (f - (elevation[i] ?? 0) > HYDROLOGY.lakeMinDepthM) water[i] = Water.lake;
    elevation[i] = f;
  }

  absorbIslets(g, water);

  // Caudal: escorrentía de cada celda acumulada aguas abajo (de las celdas más altas a las bajas).
  const cellM2 = cellKm * cellKm * 1e6;
  const acc = new Float64Array(n);
  for (let p = 0; p < popped; p++) {
    const i = order[p] ?? 0;
    const metersPerYear = (precipitation[i] ?? 0) / 1000;
    acc[i] =
      (metersPerYear * cellM2 * runoffCoefficient(temperature[i] ?? 0)) / PLANET.secondsPerYear;
  }
  for (let p = popped - 1; p >= 0; p--) {
    const i = order[p] ?? 0;
    const k = flowDir[i] ?? NO_DIR;
    if (k === NO_DIR) continue;
    const x = i % width;
    const y = (i - x) / width;
    const j = (y + (D8_DY[k] ?? 0)) * width + ((x + (D8_DX[k] ?? 0) + width) % width);
    if (water[j] !== Water.ocean) acc[j] = (acc[j] ?? 0) + (acc[i] ?? 0);
  }
  return { water, flow: Float32Array.from(acc), flowDir };
}

/**
 * Los lagos pueden dejar pedacitos de tierra aislados (sin vecinos de tierra): los que tienen
 * menos de `minLandmassCells` celdas pasan a ser lago (no quedan provincias de una celda).
 */
function absorbIslets(g: Grid, water: Uint8Array): void {
  const { width, height } = g;
  const seen = new Uint8Array(water.length);
  const stack: number[] = [];
  const component: number[] = [];
  for (let start = 0; start < water.length; start++) {
    if (seen[start] || water[start] !== Water.land) continue;
    seen[start] = 1;
    stack.push(start);
    component.length = 0;
    let touchesLake = false;
    while (stack.length > 0) {
      const i = stack.pop() ?? 0;
      component.push(i);
      const x = i % width;
      const y = (i - x) / width;
      for (let k = 0; k < 8; k++) {
        const ny = y + (D8_DY[k] ?? 0);
        if (ny < 0 || ny >= height) continue;
        const j = ny * width + ((x + (D8_DX[k] ?? 0) + width) % width);
        if (water[j] === Water.lake) touchesLake = true;
        if (seen[j] || water[j] !== Water.land) continue;
        seen[j] = 1;
        stack.push(j);
      }
    }
    if (touchesLake && component.length < RELIEF.minLandmassCells) {
      for (const i of component) water[i] = Water.lake;
    }
  }
}
