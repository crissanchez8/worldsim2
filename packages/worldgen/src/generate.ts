// Worldgen v1 (P1.1): pipeline determinista, sin plataforma (corre igual en el Worker de worldgen,
// en Node y en los tests). Cada etapa avisa su comienzo para la barra de progreso (la génesis
// animada es P3.12).
import { MapTypes, WorldSizes } from '@ws/content';
import { computeBiomes, computeHabitability } from './biomes';
import { computeClimate } from './climate';
import { PLANET } from './config';
import { provinceGraph, seaGraph } from './graph';
import { computeHydrology } from './hydrology';
import { assignProvinces, provinceStatics } from './provinces';
import {
  createPlates,
  plateField,
  rawRelief,
  seaLevelThreshold,
  sinkIslets,
  thermalErosion,
  toMeters,
} from './relief';
import { assignSeaZones, seaZoneStatics } from './seas';
import {
  hashWorldStatic,
  validateWorldStatic,
  type WorldParams,
  type WorldStatic,
  type WorldStaticData,
} from './world-static';

export const WORLDGEN_STAGES = [
  'plates',
  'relief',
  'erosion',
  'climate',
  'hydrology',
  'biomes',
  'provinces',
  'seas',
  'graph',
  'hash',
] as const;
export type WorldgenStage = (typeof WORLDGEN_STAGES)[number];

/** Aviso de comienzo de etapa: índice en `WORLDGEN_STAGES` y total de etapas. */
export type WorldgenProgress = (stage: WorldgenStage, index: number, total: number) => void;

/** Límites de la fracción de tierra (fraction): fuera de esto el mundo es degenerado. */
export const LAND_FRACTION_RANGE = [0.05, 0.9] as const;

export function validateParams(params: WorldParams): void {
  if (!(Number.isInteger(params.seed) && params.seed >= 0 && params.seed <= 0xffffffff)) {
    throw new Error(`worldgen: seed inválida (${params.seed})`);
  }
  WorldSizes.indexOf(params.size);
  MapTypes.indexOf(params.mapType);
  const [lo, hi] = LAND_FRACTION_RANGE;
  if (!(params.landFraction >= lo && params.landFraction <= hi)) {
    throw new Error(
      `worldgen: fracción de tierra fuera de [${lo}, ${hi}] (${params.landFraction})`,
    );
  }
}

export function generateWorld(params: WorldParams, onProgress?: WorldgenProgress): WorldStatic {
  validateParams(params);
  const size = WorldSizes.byKey(params.size);
  const type = MapTypes.byKey(params.mapType);
  const g = { width: size.width, height: size.height };
  const cellKm = PLANET.circumferenceKm / size.width;
  let stageIndex = 0;
  const stage = (name: WorldgenStage) => {
    onProgress?.(name, stageIndex++, WORLDGEN_STAGES.length);
  };

  stage('plates');
  const plates = createPlates(params.seed, g, type);
  const field = plateField(params.seed, g, plates);

  stage('relief');
  const raw = rawRelief(params.seed, g, type, plates, field);
  const elevation = toMeters(raw, seaLevelThreshold(raw, params.landFraction));

  stage('erosion');
  thermalErosion(g, elevation);
  sinkIslets(g, elevation);

  stage('climate');
  const { temperature, precipitation } = computeClimate(g, elevation, cellKm);

  stage('hydrology');
  const { water, flow, flowDir } = computeHydrology(
    g,
    elevation,
    temperature,
    precipitation,
    cellKm,
  );

  stage('biomes');
  const biome = computeBiomes(g, elevation, water, temperature, precipitation);
  const habitability = computeHabitability(g, elevation, water, biome, flow);

  stage('provinces');
  const input = { elevation, water, biome, flow, habitability, temperature, precipitation };
  const { province, count } = assignProvinces(params.seed, g, size.provinceTarget, cellKm, input);
  const { moveCost, ...provinces } = provinceStatics(g, cellKm, province, count, input);

  stage('seas');
  const zones = assignSeaZones(params.seed, g, size.seaZoneTarget, water);
  const seaZones = seaZoneStatics(g, cellKm, zones.seaZone, zones.count, water);

  stage('graph');
  const graph = provinceGraph(
    g,
    cellKm,
    province,
    water,
    count,
    provinces.centroidX,
    provinces.centroidY,
    moveCost,
    provinces.ruggedness,
  );
  const seas = seaGraph(g, province, zones.seaZone, count, zones.count);

  stage('hash');
  const data: WorldStaticData = {
    params: { ...params },
    raster: {
      width: g.width,
      height: g.height,
      cellKm,
      elevation,
      water,
      temperature,
      precipitation,
      biome,
      flow,
      flowDir,
      province,
      seaZone: zones.seaZone,
    },
    provinces,
    graph,
    seaZones,
    seaGraph: seas,
  };
  validateWorldStatic(data);
  return { ...data, hash: hashWorldStatic(data) };
}
