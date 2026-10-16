// Parámetros de la URL de la página del mapa (P1.2; el router y la pantalla de crear mundo son
// P1.6). Mundo: `?seed=` (número o texto), `?size=`, `?map=`, `?land=`. Render y medición:
// `?backend=webgl2`, `?dpr=`, `?aa=0`, `?exaggeration=`, `?colors=biome|id|none`, `?markers=0`,
// `?tour=1`, `?duration=` (s), `?repeat=N` (estrés), `?lod=N` (LOD fijo), `?lodDist=`,
// `?warmup=0`, `?x=`, `?z=`, `?distance=` (pose inicial, celdas).
import { rng } from '@ws/core';
import { MapTypes, WorldSizes } from '@ws/content';
import { LAND_FRACTION_RANGE, type WorldParams } from '@ws/worldgen';
import { type ColorMode, isColorMode } from './colors';
import {
  DEFAULT_VERTICAL_EXAGGERATION,
  LOD_STEPS,
  MEASURE,
  VERTICAL_EXAGGERATION_RANGE,
} from './config';

export interface MapParams {
  readonly world: WorldParams;
  readonly backend: 'auto' | 'webgl2';
  /** Relación de píxeles; `null` = la del dispositivo con tope 2. */
  readonly dpr: number | null;
  readonly antialias: boolean;
  readonly exaggeration: number;
  readonly colors: ColorMode;
  readonly markers: boolean;
  readonly tour: boolean;
  readonly tourSeconds: number;
  readonly repeat: number;
  readonly forcedLod: number | null;
  /** Distancia base del LOD (celdas, mundo mediano); `null` = la de config. */
  readonly lodDistance: number | null;
  readonly warmup: boolean;
  readonly x: number | null;
  readonly z: number | null;
  readonly distance: number | null;
}

/** Semilla por defecto: el primer mundo que ve quien abre la página sin parámetros. */
export const DEFAULT_SEED = 1;
const DEFAULT_SIZE = 'medium';
const DEFAULT_MAP_TYPE = 'continents';
/** Tope de `?repeat=` (count). */
const MAX_REPEAT = 32;
/** Relación de píxeles máxima aceptada (ratio). */
const MAX_DPR = 4;

function num(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key);
  if (raw === null || raw.trim() === '') return null;
  const v = Number(raw);
  return Number.isFinite(v) ? v : null;
}

function inRange(v: number | null, lo: number, hi: number): number | null {
  return v !== null && v >= lo && v <= hi ? v : null;
}

/** Semilla u32: un entero en rango se usa tal cual; cualquier otro texto pasa por `seedFromString`. */
export function parseSeed(raw: string | null): number {
  if (raw === null || raw.trim() === '') return DEFAULT_SEED;
  const text = raw.trim();
  if (/^\d+$/.test(text)) {
    const v = Number(text);
    if (v <= 0xffffffff) return v;
  }
  return rng.seedFromString(text);
}

function tableKey(table: { indexOf(key: string): number }, raw: string | null, fallback: string) {
  if (raw === null) return fallback;
  try {
    table.indexOf(raw);
    return raw;
  } catch {
    return fallback;
  }
}

export function readMapParams(search: string): MapParams {
  const p = new URLSearchParams(search);
  const mapType = tableKey(MapTypes, p.get('map'), DEFAULT_MAP_TYPE);
  const [landLo, landHi] = LAND_FRACTION_RANGE;
  const colors = p.get('colors') ?? 'biome';
  const lod = inRange(num(p, 'lod'), 0, LOD_STEPS.length - 1);
  return {
    world: {
      seed: parseSeed(p.get('seed')),
      size: tableKey(WorldSizes, p.get('size'), DEFAULT_SIZE),
      mapType,
      landFraction:
        inRange(num(p, 'land'), landLo, landHi) ?? MapTypes.byKey(mapType).defaultLandFraction,
    },
    backend: p.get('backend') === 'webgl2' ? 'webgl2' : 'auto',
    dpr: inRange(num(p, 'dpr'), 0.25, MAX_DPR),
    antialias: p.get('aa') !== '0',
    exaggeration:
      inRange(num(p, 'exaggeration'), ...VERTICAL_EXAGGERATION_RANGE) ??
      DEFAULT_VERTICAL_EXAGGERATION,
    colors: isColorMode(colors) ? colors : 'biome',
    markers: p.get('markers') !== '0',
    tour: p.get('tour') === '1',
    tourSeconds: inRange(num(p, 'duration'), 1, 600) ?? MEASURE.tourSeconds,
    repeat: Math.round(inRange(num(p, 'repeat'), 1, MAX_REPEAT) ?? 1),
    forcedLod: lod === null ? null : Math.round(lod),
    lodDistance: inRange(num(p, 'lodDist'), 1, 10_000),
    warmup: p.get('warmup') !== '0',
    x: num(p, 'x'),
    z: num(p, 'z'),
    distance: num(p, 'distance'),
  };
}
