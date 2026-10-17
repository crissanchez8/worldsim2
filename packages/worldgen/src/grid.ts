// Mundo de grilla: un `WorldStatic` chico y determinista para tests de la simulación. No es un
// planeta: cada provincia es una celda de 100 × 100 km, con wrap E-O y habitabilidad en ondas;
// sin agua ni zonas marítimas.
import { Biomes } from '@ws/content';
import { math, rng } from '@ws/core';
import { NO_DIR } from './raster';
import {
  hashWorldStatic,
  type ProvinceGraph,
  validateWorldStatic,
  type WorldStatic,
  type WorldStaticData,
} from './world-static';

export interface GridOptions {
  readonly seed: number;
  /** Provincias por fila (count; con wrap E-O) y filas (count). */
  readonly width: number;
  readonly height: number;
}

/** Lado de cada provincia-celda (km). */
const GRID_CELL_KM = 100;
/** Costo de cruzar entre provincias vecinas (days): 100 km a 25 km/día. */
const GRID_EDGE_DAYS = 4;
const SUB_HABITABILITY = 1;

export function createGridWorld(options: GridOptions): WorldStatic {
  const { seed, width: w, height: h } = options;
  const n = w * h;
  const cells = n;
  const grassland = Biomes.indexOf('grassland');

  const habitability = new Float32Array(n + 1);
  const coastal = new Uint8Array(n + 1);
  const province = new Uint16Array(cells);
  const centroidX = new Float32Array(n + 1);
  const centroidY = new Float32Array(n + 1);
  const centroidLat = new Float32Array(n + 1);
  const centroidLon = new Float32Array(n + 1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const id = y * w + x + 1;
      const wave = math.sin((x * math.TAU) / w) * math.cos(((y + 0.5) * math.PI) / h - math.PI / 2);
      const jitter = rng.rngUniform(seed, rng.Streams.worldgenNoise, SUB_HABITABILITY, id, 0, 0);
      habitability[id] = math.clamp(0.5 + 0.35 * wave + 0.3 * (jitter - 0.5), 0.02, 1);
      coastal[id] = y === 0 || y === h - 1 ? 1 : 0;
      province[id - 1] = id;
      centroidX[id] = x;
      centroidY[id] = y;
      centroidLat[id] = 90 - ((y + 0.5) * 180) / h;
      centroidLon[id] = ((x + 0.5) / w) * 360 - 180;
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
    kind: new Uint8Array(at),
    baseCost: new Float32Array(at).fill(GRID_EDGE_DAYS),
    borderLength: new Float32Array(at).fill(GRID_CELL_KM),
  };

  const data: WorldStaticData = {
    params: { seed, size: 'small', mapType: 'continents', landFraction: 1 },
    raster: {
      width: w,
      height: h,
      cellKm: GRID_CELL_KM,
      elevation: new Float32Array(cells).fill(100),
      water: new Uint8Array(cells),
      temperature: new Float32Array(cells).fill(15),
      precipitation: new Float32Array(cells).fill(800),
      biome: new Uint8Array(cells).fill(grassland),
      flow: new Float32Array(cells),
      flowDir: new Uint8Array(cells).fill(NO_DIR),
      province,
      seaZone: new Uint16Array(cells),
    },
    provinces: {
      count: n,
      area: new Float64Array(n + 1).fill(GRID_CELL_KM * GRID_CELL_KM),
      habitability,
      coastal,
      arableFraction: new Float32Array(n + 1).fill(0.5),
      ruggedness: new Float32Array(n + 1),
      meanElevation: new Float32Array(n + 1).fill(100),
      meanTemperature: new Float32Array(n + 1).fill(15),
      meanPrecipitation: new Float32Array(n + 1).fill(800),
      dominantBiome: new Uint8Array(n + 1).fill(grassland),
      maxRiverFlow: new Float32Array(n + 1),
      navigableRiver: new Uint8Array(n + 1),
      centroidX,
      centroidY,
      centroidLat,
      centroidLon,
    },
    graph,
    seaZones: { count: 0, area: new Float64Array(1), coastal: new Uint8Array(1) },
    seaGraph: {
      provinceZonesStart: new Uint32Array(n + 2),
      provinceZones: new Uint16Array(0),
      zoneNeighborsStart: new Uint32Array(2),
      zoneNeighbors: new Uint16Array(0),
    },
  };
  validateWorldStatic(data);
  return { ...data, hash: hashWorldStatic(data) };
}
