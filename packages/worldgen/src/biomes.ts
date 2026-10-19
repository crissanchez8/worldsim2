// Biomas v1 (tabla en `@ws/content`) y habitabilidad por celda (densidad de provincias y
// población inicial).
import { Biomes, classifyBiome } from '@ws/content';
import { HYDROLOGY, PROVINCES, REFERENCE_WIDTH } from './config';
import { Water } from './hydrology';
import { D8_DX, D8_DY, type Grid } from './raster';

/** Sin bioma (agua). */
export const NO_BIOME = 255;

export function computeBiomes(
  g: Grid,
  elevation: Float32Array,
  water: Uint8Array,
  temperature: Float32Array,
  precipitation: Float32Array,
): Uint8Array {
  const biome = new Uint8Array(g.width * g.height);
  for (let i = 0; i < biome.length; i++) {
    biome[i] =
      water[i] === Water.land
        ? classifyBiome(temperature[i] ?? 0, precipitation[i] ?? 0, elevation[i] ?? 0)
        : NO_BIOME;
  }
  return biome;
}

/** Máximo desnivel (m) con los 4 vecinos de la celda. */
export function slopeAt(g: Grid, elevation: Float32Array, i: number): number {
  const { width, height } = g;
  const x = i % width;
  const y = (i - x) / width;
  const h = elevation[i] ?? 0;
  let max = 0;
  for (let k = 0; k < 8; k += 2) {
    const ny = y + (D8_DY[k] ?? 0);
    if (ny < 0 || ny >= height) continue;
    const j = ny * width + ((x + (D8_DX[k] ?? 0) + width) % width);
    const d = Math.abs(h - (elevation[j] ?? 0));
    if (d > max) max = d;
  }
  return max;
}

/** Factor de pendiente (fraction): 1 en llano, 0 desde la pendiente máxima habitable. */
export function slopeFactor(g: Grid, slopeM: number): number {
  const max = (PROVINCES.maxHabitableSlopeM * REFERENCE_WIDTH) / g.width;
  return Math.max(0, 1 - slopeM / max);
}

/** Habitabilidad por celda (score [0, 1]): bioma × pendiente + río + costa; 0 en el agua. */
export function computeHabitability(
  g: Grid,
  elevation: Float32Array,
  water: Uint8Array,
  biome: Uint8Array,
  flow: Float32Array,
): Float32Array {
  const { width, height } = g;
  const out = new Float32Array(width * height);
  for (let i = 0; i < out.length; i++) {
    if (water[i] !== Water.land) continue;
    let h =
      (Biomes.rows[biome[i] ?? 0]?.habitability ?? 0) * slopeFactor(g, slopeAt(g, elevation, i));
    if ((flow[i] ?? 0) >= HYDROLOGY.riverMinFlow) h += PROVINCES.riverHabitability;
    const x = i % width;
    const y = (i - x) / width;
    for (let k = 0; k < 8; k++) {
      const ny = y + (D8_DY[k] ?? 0);
      if (ny < 0 || ny >= height) continue;
      const j = ny * width + ((x + (D8_DX[k] ?? 0) + width) % width);
      if (water[j] !== Water.land) {
        h += PROVINCES.coastHabitability;
        break;
      }
    }
    out[i] = Math.min(1, h);
  }
  return out;
}
