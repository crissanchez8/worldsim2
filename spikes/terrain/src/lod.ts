// Funciones puras de LOD y wrap E-O (sin three), testeables en Node.

/**
 * X de la copia de un chunk más cercana a la cámara. El mundo se repite cada `worldWidth`
 * celdas: cada chunk existe una sola vez y se reposiciona a menos de medio mundo de la cámara.
 */
export function nearestCopyX(
  chunkX0: number,
  chunkSize: number,
  cameraX: number,
  worldWidth: number,
): number {
  const center = chunkX0 + chunkSize / 2;
  return chunkX0 + worldWidth * Math.round((cameraX - center) / worldWidth);
}

/** Distancia 3D de la cámara al rectángulo XZ del chunk (a nivel del mar), en unidades. */
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
