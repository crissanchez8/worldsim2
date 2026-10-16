// Mundo estático (docs/model.md §4): la salida del worldgen, función pura de (seed, parámetros,
// ENGINE_VERSION, contenido). No va al snapshot (se regenera); su hash va en la cabecera del
// `.wsim` y en el estado (un snapshot no se carga sobre otro mundo).
//
// v1 (P1.1): ráster, provincias, grafo de movimiento (tierra + estrechos), zonas marítimas y sus
// adyacencias. P3 agrega suelos, recursos, especies y deglaciación sin cambiar lo que ya existe.
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

/** Ráster por celda (`WorldRaster`, model §4.2). Índice i = y·width + x; fila 0 = polo norte. */
export interface WorldRaster {
  readonly width: number;
  readonly height: number;
  /** Lado de una celda (km): perímetro / ancho (el mundo es un cilindro, D6). */
  readonly cellKm: number;
  /** m sobre el nivel del mar; en tierra y lagos, la superficie (lagos a nivel de desborde). */
  readonly elevation: Float32Array;
  /** 0 tierra, 1 océano, 2 lago (`Water`). */
  readonly water: Uint8Array;
  /** celsius (media anual). */
  readonly temperature: Float32Array;
  /** mm_per_year. */
  readonly precipitation: Float32Array;
  /** Índice de `Biomes` (content); 255 en el agua. */
  readonly biome: Uint8Array;
  /** m3_per_s. */
  readonly flow: Float32Array;
  /** Desagüe D8 (0–7) de tierra y lagos; 255 sin desagüe. */
  readonly flowDir: Uint8Array;
  /** id de provincia; 0 = agua. */
  readonly province: Uint16Array;
  /** id de zona marítima; 0 = tierra o lago. */
  readonly seaZone: Uint16Array;
}

/** Provincias de tierra (SoA). El índice es el id: ids 1..count, el 0 no se usa. */
export interface ProvinceStatic {
  readonly count: number;
  /** km2 (de tierra; los lagos no son de ninguna provincia en P1). */
  readonly area: Float64Array;
  /** score [0, 1]. */
  readonly habitability: Float32Array;
  /** flag: toca el océano. */
  readonly coastal: Uint8Array;
  /** fraction. */
  readonly arableFraction: Float32Array;
  /** score [0, 1]. */
  readonly ruggedness: Float32Array;
  /** m. */
  readonly meanElevation: Float32Array;
  /** celsius. */
  readonly meanTemperature: Float32Array;
  /** mm_per_year. */
  readonly meanPrecipitation: Float32Array;
  /** Índice de `Biomes`. */
  readonly dominantBiome: Uint8Array;
  /** m3_per_s. */
  readonly maxRiverFlow: Float32Array;
  /** flag. */
  readonly navigableRiver: Uint8Array;
  /** Centroide en celdas del ráster (x con wrap). */
  readonly centroidX: Float32Array;
  readonly centroidY: Float32Array;
  /** degrees. */
  readonly centroidLat: Float32Array;
  readonly centroidLon: Float32Array;
}

/** Tipo de arista del grafo de provincias. */
export const EdgeKind = { land: 0, strait: 1 } as const;

/**
 * Grafo de movimiento entre provincias, en CSR por id: los vecinos de `p` son
 * `neighbors[offsets[p] .. offsets[p + 1])`, en orden creciente de id. Simétrico.
 */
export interface ProvinceGraph {
  /** Largo count + 2 (offsets[0] = offsets[1] = 0). */
  readonly offsets: Uint32Array;
  readonly neighbors: Uint32Array;
  /** `EdgeKind`. */
  readonly kind: Uint8Array;
  /** days: costo de referencia de ir de una provincia a la otra (M7). */
  readonly baseCost: Float32Array;
  /** km: frontera compartida (0 en los estrechos). */
  readonly borderLength: Float32Array;
}

export interface SeaZoneStatic {
  readonly count: number;
  /** km2. */
  readonly area: Float64Array;
  /** flag: toca tierra. */
  readonly coastal: Uint8Array;
}

/** Adyacencias marítimas en CSR: provincia → zonas que toca; zona → zonas vecinas. */
export interface SeaGraph {
  /** Largo provincias + 2. */
  readonly provinceZonesStart: Uint32Array;
  readonly provinceZones: Uint16Array;
  /** Largo zonas + 2. */
  readonly zoneNeighborsStart: Uint32Array;
  readonly zoneNeighbors: Uint16Array;
}

export interface WorldStatic {
  readonly params: WorldParams;
  readonly raster: WorldRaster;
  readonly provinces: ProvinceStatic;
  readonly graph: ProvinceGraph;
  readonly seaZones: SeaZoneStatic;
  readonly seaGraph: SeaGraph;
  /** hash64 de todo lo anterior (16 hex). */
  readonly hash: string;
}

export type WorldStaticData = Omit<WorldStatic, 'hash'>;

type NumericArray =
  Float64Array | Float32Array | Uint32Array | Int32Array | Uint16Array | Uint8Array;

/** Todos los arrays del mundo en un orden fijo (hash, validación y transferencia). */
export function worldArrays(world: WorldStaticData): readonly [string, NumericArray][] {
  const { raster: r, provinces: p, graph: g, seaZones: s, seaGraph: sg } = world;
  return [
    ['raster.elevation', r.elevation],
    ['raster.water', r.water],
    ['raster.temperature', r.temperature],
    ['raster.precipitation', r.precipitation],
    ['raster.biome', r.biome],
    ['raster.flow', r.flow],
    ['raster.flowDir', r.flowDir],
    ['raster.province', r.province],
    ['raster.seaZone', r.seaZone],
    ['provinces.area', p.area],
    ['provinces.habitability', p.habitability],
    ['provinces.coastal', p.coastal],
    ['provinces.arableFraction', p.arableFraction],
    ['provinces.ruggedness', p.ruggedness],
    ['provinces.meanElevation', p.meanElevation],
    ['provinces.meanTemperature', p.meanTemperature],
    ['provinces.meanPrecipitation', p.meanPrecipitation],
    ['provinces.dominantBiome', p.dominantBiome],
    ['provinces.maxRiverFlow', p.maxRiverFlow],
    ['provinces.navigableRiver', p.navigableRiver],
    ['provinces.centroidX', p.centroidX],
    ['provinces.centroidY', p.centroidY],
    ['provinces.centroidLat', p.centroidLat],
    ['provinces.centroidLon', p.centroidLon],
    ['graph.offsets', g.offsets],
    ['graph.neighbors', g.neighbors],
    ['graph.kind', g.kind],
    ['graph.baseCost', g.baseCost],
    ['graph.borderLength', g.borderLength],
    ['seaZones.area', s.area],
    ['seaZones.coastal', s.coastal],
    ['seaGraph.provinceZonesStart', sg.provinceZonesStart],
    ['seaGraph.provinceZones', sg.provinceZones],
    ['seaGraph.zoneNeighborsStart', sg.zoneNeighborsStart],
    ['seaGraph.zoneNeighbors', sg.zoneNeighbors],
  ];
}

/** Hash del mundo estático: parámetros + dimensiones + todos los arrays, en orden fijo. */
export function hashWorldStatic(world: WorldStaticData): string {
  const w = new serialize.ByteWriter();
  const { params, raster } = world;
  w.u32(params.seed);
  w.str(params.size);
  w.str(params.mapType);
  w.f64(params.landFraction);
  w.u32(raster.width);
  w.u32(raster.height);
  w.f64(raster.cellKm);
  w.u32(world.provinces.count);
  w.u32(world.seaZones.count);
  for (const [name, array] of worldArrays(world)) {
    w.str(name);
    w.u32(array.length);
    w.numeric(array, array.length);
  }
  return hash.hash64(w.finish());
}

/** Buffers de todos los arrays (para `postMessage` con transferencia, sin copia). */
export function transferables(world: WorldStaticData): ArrayBuffer[] {
  const out = new Set<ArrayBuffer>();
  for (const [, array] of worldArrays(world)) {
    if (array.buffer instanceof ArrayBuffer) out.add(array.buffer);
  }
  return [...out];
}

/** Vecinos de una provincia (vista sin copia). */
export function neighborsOf(graph: ProvinceGraph, province: number): Uint32Array {
  return graph.neighbors.subarray(graph.offsets[province] ?? 0, graph.offsets[province + 1] ?? 0);
}

function fail(message: string): never {
  throw new Error(`WorldStatic: ${message}`);
}

/** Valida la forma del mundo (tamaños, ids, simetría del grafo). Lanza con el primer error. */
export function validateWorldStatic(world: WorldStaticData): void {
  const { raster: r, provinces: p, graph: g, seaZones: s, seaGraph: sg } = world;
  const cells = r.width * r.height;
  const n = p.count;
  if (!Number.isInteger(n) || n < 1 || n > 0xffff) fail(`provincias: count ${n}`);
  for (const [name, array] of worldArrays(world)) {
    const [part] = name.split('.');
    const want =
      part === 'raster'
        ? cells
        : part === 'provinces'
          ? n + 1
          : part === 'seaZones'
            ? s.count + 1
            : array.length;
    if (array.length !== want) fail(`${name}: largo ${array.length} (esperado ${want})`);
  }
  for (const id of r.province) if (id > n) fail(`raster.province: id ${id} > ${n}`);
  for (const id of r.seaZone) if (id > s.count) fail(`raster.seaZone: id ${id} > ${s.count}`);
  if (g.offsets.length !== n + 2) fail(`grafo: offsets de largo ${g.offsets.length}`);
  const edges = g.offsets[n + 1] ?? 0;
  for (const [name, array] of [
    ['neighbors', g.neighbors],
    ['kind', g.kind],
    ['baseCost', g.baseCost],
    ['borderLength', g.borderLength],
  ] as const) {
    if (array.length !== edges) fail(`grafo.${name}: largo ${array.length} (esperado ${edges})`);
  }
  for (let a = 1; a <= n; a++) {
    let prev = 0;
    for (let e = g.offsets[a] ?? 0; e < (g.offsets[a + 1] ?? 0); e++) {
      const b = g.neighbors[e] ?? 0;
      if (b < 1 || b > n || b === a) fail(`grafo: arista ${a}→${b} inválida`);
      if (b <= prev) fail(`grafo: vecinos de ${a} no crecientes`);
      prev = b;
      const back = neighborsOf(g, b).indexOf(a);
      if (back < 0) fail(`grafo: ${a}→${b} sin vuelta`);
      if (g.kind[(g.offsets[b] ?? 0) + back] !== g.kind[e])
        fail(`grafo: ${a}↔${b} de tipos distintos`);
      if (!((g.baseCost[e] ?? 0) > 0)) fail(`grafo: costo ${a}→${b} no positivo`);
    }
  }
  if (sg.provinceZonesStart.length !== n + 2) fail('seaGraph.provinceZonesStart: largo');
  if (sg.zoneNeighborsStart.length !== s.count + 2) fail('seaGraph.zoneNeighborsStart: largo');
}
