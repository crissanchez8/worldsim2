// Provincias v1 (P1.1): semillas ponderadas por habitabilidad y crecimiento por costo mínimo con
// recargo en crestas, alturas y ríos grandes → fronteras naturales. Después, los datos estáticos
// de cada provincia (`ProvinceStatic`).
import { Biomes } from '@ws/content';
import { rng } from '@ws/core';
import { slopeAt, slopeFactor } from './biomes';
import { HYDROLOGY, PROVINCES, REFERENCE_WIDTH } from './config';
import { Water } from './hydrology';
import { D8_LENGTH, type Grid, latitudeOf, wrapDx } from './raster';
import { assignRegions, mergeSmallRegions, placeSeeds } from './regions';
import type { ProvinceStatic } from './world-static';

/** Sub-streams de `worldgenProvinces` (no reasignar). */
export const SUB_PROVINCE_SEEDS = 1;
export const SUB_SEA_SEEDS = 2;

export interface ProvinceInputs {
  readonly elevation: Float32Array;
  readonly water: Uint8Array;
  readonly biome: Uint8Array;
  readonly flow: Float32Array;
  readonly habitability: Float32Array;
  readonly temperature: Float32Array;
  readonly precipitation: Float32Array;
}

/** Provincia de cada celda (0 = agua) y cantidad de provincias. */
export function assignProvinces(
  seed: number,
  g: Grid,
  target: number,
  cellKm: number,
  input: ProvinceInputs,
): { readonly province: Uint16Array; readonly count: number } {
  const n = g.width * g.height;
  const passable = new Uint8Array(n);
  let landCells = 0;
  for (let i = 0; i < n; i++) {
    if (input.water[i] === Water.land) {
      passable[i] = 1;
      landCells++;
    }
  }
  const candidates = new Int32Array(landCells);
  let at = 0;
  for (let i = 0; i < n; i++) if (passable[i]) candidates[at++] = i;
  const seeds = placeSeeds(g, {
    target,
    candidates,
    weight: input.habitability,
    stream: rng.createRng(seed).stream(rng.Streams.worldgenProvinces).sub(SUB_PROVINCE_SEEDS),
  });

  const { elevation, flow, biome } = input;
  const moveCost = (i: number) => Biomes.rows[biome[i] ?? 0]?.moveCost ?? 1;
  const cost = (from: number, to: number, k: number) => {
    const climb = Math.abs((elevation[to] ?? 0) - (elevation[from] ?? 0)) / PROVINCES.climbScaleM;
    const high =
      Math.max(0, (elevation[to] ?? 0) - PROVINCES.highlandFromM) / PROVINCES.highlandScaleM;
    const river =
      (flow[to] ?? 0) >= HYDROLOGY.borderRiverFlow && (flow[from] ?? 0) < HYDROLOGY.borderRiverFlow
        ? PROVINCES.riverCrossing
        : 1;
    const terrain = (moveCost(from) + moveCost(to)) / 2;
    return (D8_LENGTH[k] ?? 1) * cellKm * terrain * (1 + climb + high) * river;
  };
  const province = new Uint16Array(n);
  const grown = assignRegions(g, seeds, province, passable, cost, input.habitability);
  const minCells = Math.ceil(PROVINCES.minProvinceAreaKm2 / (cellKm * cellKm));
  const count = mergeSmallRegions(g, province, grown, minCells);
  return { province, count };
}

/** Datos estáticos por provincia (SoA, índice = id; el 0 no se usa). */
export function provinceStatics(
  g: Grid,
  cellKm: number,
  province: Uint16Array,
  count: number,
  input: ProvinceInputs,
): ProvinceStatic & { readonly moveCost: Float32Array } {
  const { width, height } = g;
  const n = width * height;
  const cells = new Uint32Array(count + 1);
  const anchorX = new Int32Array(count + 1).fill(-1);
  const sumDx = new Float64Array(count + 1);
  const sumY = new Float64Array(count + 1);
  const sumHab = new Float64Array(count + 1);
  const sumArable = new Float64Array(count + 1);
  const sumSlope = new Float64Array(count + 1);
  const sumElev = new Float64Array(count + 1);
  const sumTemp = new Float64Array(count + 1);
  const sumPrecip = new Float64Array(count + 1);
  const sumMove = new Float64Array(count + 1);
  const maxRiverFlow = new Float32Array(count + 1);
  const coastal = new Uint8Array(count + 1);
  const biomes = Biomes.rows.length;
  const biomeCells = new Uint32Array((count + 1) * biomes);

  const ocean = (j: number) => j >= 0 && input.water[j] === Water.ocean;
  for (let i = 0; i < n; i++) {
    const p = province[i] ?? 0;
    if (p === 0) continue;
    const x = i % width;
    const y = (i - x) / width;
    cells[p] = (cells[p] ?? 0) + 1;
    if ((anchorX[p] ?? -1) < 0) anchorX[p] = x;
    sumDx[p] = (sumDx[p] ?? 0) + wrapDx(width, anchorX[p] ?? 0, x);
    sumY[p] = (sumY[p] ?? 0) + y;
    const slope = slopeAt(g, input.elevation, i);
    const b = input.biome[i] ?? 0;
    const row = Biomes.rows[b];
    sumHab[p] = (sumHab[p] ?? 0) + (input.habitability[i] ?? 0);
    sumArable[p] = (sumArable[p] ?? 0) + (row?.arable ?? 0) * slopeFactor(g, slope);
    sumSlope[p] = (sumSlope[p] ?? 0) + slope;
    sumElev[p] = (sumElev[p] ?? 0) + (input.elevation[i] ?? 0);
    sumTemp[p] = (sumTemp[p] ?? 0) + (input.temperature[i] ?? 0);
    sumPrecip[p] = (sumPrecip[p] ?? 0) + (input.precipitation[i] ?? 0);
    sumMove[p] = (sumMove[p] ?? 0) + (row?.moveCost ?? 1);
    biomeCells[p * biomes + b] = (biomeCells[p * biomes + b] ?? 0) + 1;
    if ((input.flow[i] ?? 0) > (maxRiverFlow[p] ?? 0)) maxRiverFlow[p] = input.flow[i] ?? 0;
    if (!coastal[p]) {
      if (
        ocean(y * width + ((x + 1) % width)) ||
        ocean(y * width + ((x + width - 1) % width)) ||
        ocean(y > 0 ? i - width : -1) ||
        ocean(y + 1 < height ? i + width : -1)
      ) {
        coastal[p] = 1;
      }
    }
  }

  const cellArea = cellKm * cellKm;
  const ruggedScale = (PROVINCES.ruggednessScaleM * width) / REFERENCE_WIDTH;
  const out = {
    count,
    area: new Float64Array(count + 1),
    habitability: new Float32Array(count + 1),
    coastal,
    arableFraction: new Float32Array(count + 1),
    ruggedness: new Float32Array(count + 1),
    meanElevation: new Float32Array(count + 1),
    meanTemperature: new Float32Array(count + 1),
    meanPrecipitation: new Float32Array(count + 1),
    dominantBiome: new Uint8Array(count + 1),
    maxRiverFlow,
    navigableRiver: new Uint8Array(count + 1),
    centroidX: new Float32Array(count + 1),
    centroidY: new Float32Array(count + 1),
    centroidLat: new Float32Array(count + 1),
    centroidLon: new Float32Array(count + 1),
    moveCost: new Float32Array(count + 1),
  };
  for (let p = 1; p <= count; p++) {
    const c = cells[p] ?? 0;
    if (c === 0) throw new Error(`worldgen: provincia ${p} sin celdas`);
    out.area[p] = c * cellArea;
    out.habitability[p] = (sumHab[p] ?? 0) / c;
    out.arableFraction[p] = (sumArable[p] ?? 0) / c;
    out.ruggedness[p] = Math.min(1, (sumSlope[p] ?? 0) / c / ruggedScale);
    out.meanElevation[p] = (sumElev[p] ?? 0) / c;
    out.meanTemperature[p] = (sumTemp[p] ?? 0) / c;
    out.meanPrecipitation[p] = (sumPrecip[p] ?? 0) / c;
    out.moveCost[p] = (sumMove[p] ?? 0) / c;
    let best = 0;
    for (let b = 1; b < biomes; b++) {
      if ((biomeCells[p * biomes + b] ?? 0) > (biomeCells[p * biomes + best] ?? 0)) best = b;
    }
    out.dominantBiome[p] = best;
    out.navigableRiver[p] = (maxRiverFlow[p] ?? 0) >= HYDROLOGY.navigableFlow ? 1 : 0;
    const cx = ((((anchorX[p] ?? 0) + (sumDx[p] ?? 0) / c) % width) + width) % width;
    const cy = (sumY[p] ?? 0) / c;
    out.centroidX[p] = cx;
    out.centroidY[p] = cy;
    out.centroidLat[p] = latitudeOf(height, cy);
    out.centroidLon[p] = ((cx + 0.5) / width) * 360 - 180;
  }
  return out;
}
