// Wrap E-O y LOD (funciones puras, sin three). El mundo es un cilindro: X se repite cada `width`
// celdas; Z (filas) va de 0 (polo norte) a height − 1 sin repetir.
import { wrap } from '@ws/core/math';

export { wrap };

/**
 * X de la copia de un chunk más cercana a la cámara. Cada chunk existe una sola vez y se
 * reposiciona a menos de medio mundo de la cámara.
 */
export function nearestCopyX(
  chunkX0: number,
  chunkSize: number,
  cameraX: number,
  width: number,
): number {
  const center = chunkX0 + chunkSize / 2;
  return chunkX0 + width * Math.round((cameraX - center) / width);
}

/** Distancia 3D de la cámara al rectángulo XZ del chunk (a nivel del mar), en celdas. */
export function distanceToChunk(
  camX: number,
  camY: number,
  camZ: number,
  x0: number,
  z0: number,
  size: number,
): number {
  const dx = camX < x0 ? x0 - camX : camX > x0 + size ? camX - x0 - size : 0;
  const dz = camZ < z0 ? z0 - camZ : camZ > z0 + size ? camZ - z0 - size : 0;
  return Math.sqrt(dx * dx + camY * camY + dz * dz);
}

/** Nivel de LOD: 0 hasta `base`, y uno más cada vez que se duplica la distancia. */
export function lodForDistance(distance: number, base: number, levels: number): number {
  let level = 0;
  let threshold = base;
  while (level < levels - 1 && distance >= threshold) {
    level++;
    threshold *= 2;
  }
  return level;
}

/** Celda (columna, fila) que contiene el punto de mundo (X, Z); `null` fuera de los polos. */
export function cellAt(
  width: number,
  height: number,
  worldX: number,
  worldZ: number,
): { readonly x: number; readonly y: number } | null {
  // La celda x ocupa [x − 0.5, x + 0.5): es la que muestrea la GPU con filtro NEAREST en
  // uv = (X + 0.5) / width.
  const y = Math.floor(worldZ + 0.5);
  if (y < 0 || y >= height) return null;
  const x = wrap(Math.floor(worldX + 0.5), width);
  return { x, y };
}

/**
 * Valor bilineal de un campo por celda en (X, Z), como lo filtra la GPU (repetición en X,
 * borde en Z). Los centros de celda están en coordenadas enteras.
 */
export function sampleBilinear(
  values: ArrayLike<number>,
  width: number,
  height: number,
  worldX: number,
  worldZ: number,
): number {
  const z = Math.min(Math.max(worldZ, 0), height - 1);
  const x0 = Math.floor(worldX);
  const z0 = Math.min(Math.floor(z), height - 2);
  const fx = worldX - x0;
  const fz = z - z0;
  const xa = wrap(x0, width);
  const xb = wrap(x0 + 1, width);
  const row0 = z0 * width;
  const row1 = row0 + width;
  const v00 = values[row0 + xa] ?? 0;
  const v10 = values[row0 + xb] ?? 0;
  const v01 = values[row1 + xa] ?? 0;
  const v11 = values[row1 + xb] ?? 0;
  const top = v00 + (v10 - v00) * fx;
  const bottom = v01 + (v11 - v01) * fx;
  return top + (bottom - top) * fz;
}
