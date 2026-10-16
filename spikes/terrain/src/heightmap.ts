// Heightmap de ruido con wrap E-O sin costura: el ruido 3D se muestrea sobre un cilindro cuyo
// perímetro mide `width` celdas, así la columna 0 y la `width − 1` son vecinas de verdad.
// Determinista: RNG por contador de @ws/core (stream `spike`) + @ws/core/math para cos/sin.
import { hash64 } from '@ws/core/hash';
import { clamp, cos, sin, smoothstep, TAU } from '@ws/core/math';
import { createRng, Streams } from '@ws/core/rng';
import { MAX_DEPTH_M, MAX_LAND_M } from './config';
import { createPerm, fbm3, ridged3 } from './noise';

/** Sub-streams del stream `spike` (uno por capa de ruido; no reasignar). */
const SUB_CONTINENTS = 1;
const SUB_RIDGES = 2;

/** Longitud de onda de la octava base de continentes, en celdas. */
const CONTINENT_WAVELENGTH = 512;
/** Octavas de continentes: de 512 a 2 celdas. */
const CONTINENT_OCTAVES = 9;
/** Longitud de onda de la octava base de cordilleras, en celdas. */
const RIDGE_WAVELENGTH = 256;
/** Octavas de cordilleras: de 256 a 8 celdas. */
const RIDGE_OCTAVES = 6;
/** Atenuación de amplitud por octava (adimensional). */
const GAIN = 0.5;
/** Corrimiento del nivel del mar sobre el ruido de continentes (adimensional; ≈35 % de tierra). */
const SEA_BIAS = 0.06;
/** Escala del ruido de continentes que se mapea a la elevación máxima (adimensional). */
const CONTINENT_RANGE = 0.35;
/** Escala del ruido bajo el nivel del mar que se mapea a la profundidad máxima (adimensional). */
const OCEAN_RANGE = 0.5;
/** Fracción de MAX_LAND_M que aportan las llanuras; el resto lo ponen las cordilleras. */
const PLAINS_SHARE = 0.25;
/** Latitud normalizada (|lat| ∈ [0, 1]) desde la que se hunden los polos. */
const POLAR_SINK_FROM = 0.82;
/** Hundimiento máximo en los polos, en unidades de ruido (adimensional). */
const POLAR_SINK = 0.25;

export interface Heightmap {
  readonly width: number;
  readonly height: number;
  /** Elevación sobre el nivel del mar, en m (negativo = océano). Fila mayor: i = y·width + x. */
  readonly elevation: Float32Array;
  readonly minM: number;
  readonly maxM: number;
  /** Fracción de celdas sobre el nivel del mar (adimensional). */
  readonly landFraction: number;
}

export function generateHeightmap(seed: number, width: number, height: number): Heightmap {
  const spike = createRng(seed).stream(Streams.spike);
  const continentsDraw = spike.sub(SUB_CONTINENTS).at(0, 0);
  const ridgesDraw = spike.sub(SUB_RIDGES).at(0, 0);
  const pc = createPerm(continentsDraw);
  const pr = createPerm(ridgesDraw);
  // Desplazamiento en el eje del cilindro: separa las capas aunque compartan coordenadas.
  const offC = continentsDraw.range(0, 256);
  const offR = ridgesDraw.range(0, 256);

  // Radio del cilindro: 1 celda de arco = 1 unidad, para que el ruido sea isótropo.
  const radius = width / TAU;
  const colX = new Float64Array(width);
  const colY = new Float64Array(width);
  for (let x = 0; x < width; x++) {
    const theta = (TAU * x) / width;
    colX[x] = radius * cos(theta);
    colY[x] = radius * sin(theta);
  }

  const fc = 1 / CONTINENT_WAVELENGTH;
  const fr = 1 / RIDGE_WAVELENGTH;
  const elevation = new Float32Array(width * height);
  let minM = Infinity;
  let maxM = -Infinity;
  let land = 0;

  for (let y = 0; y < height; y++) {
    const lat = Math.abs(((y + 0.5) / height) * 2 - 1);
    const polar = POLAR_SINK * smoothstep(POLAR_SINK_FROM, 1, lat);
    const zc = y * fc + offC;
    const zr = y * fr + offR;
    for (let x = 0; x < width; x++) {
      const cx = colX[x] ?? 0;
      const cy = colY[x] ?? 0;
      const e = fbm3(pc, cx * fc, cy * fc, zc, CONTINENT_OCTAVES, GAIN) - SEA_BIAS - polar;
      let m: number;
      if (e > 0) {
        const plains = clamp(e / CONTINENT_RANGE, 0, 1) * PLAINS_SHARE;
        const mask = smoothstep(0.02, 0.2, e);
        const ridge = ridged3(pr, cx * fr, cy * fr, zr, RIDGE_OCTAVES, GAIN);
        const r2 = ridge * ridge;
        const mountains = mask * r2 * r2 * (1 - PLAINS_SHARE);
        m = clamp(plains + mountains, 0, 1) * MAX_LAND_M;
        land++;
      } else {
        m = clamp(e / OCEAN_RANGE, -1, 0) * MAX_DEPTH_M;
      }
      const i = y * width + x;
      elevation[i] = m;
      const stored = elevation[i] ?? m;
      if (stored < minM) minM = stored;
      if (stored > maxM) maxM = stored;
    }
  }

  return { width, height, elevation, minM, maxM, landFraction: land / (width * height) };
}

/** Hash de 64 bits de los bytes del heightmap: sirve para comparar navegadores y Node. */
export function heightmapHash(map: Heightmap): string {
  return hash64(
    new Uint8Array(map.elevation.buffer, map.elevation.byteOffset, map.elevation.byteLength),
  );
}
