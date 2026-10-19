// Geometría del ráster: cilindro con wrap E-O (D6), sin wrap N-S. Índice i = y·width + x, fila 0
// = polo norte.

/** Desplazamientos D8 (dx, dy), en este orden: E, SE, S, SO, O, NO, N, NE. */
export const D8_DX = [1, 1, 0, -1, -1, -1, 0, 1] as const;
export const D8_DY = [0, 1, 1, 1, 0, -1, -1, -1] as const;
/** Largo de cada paso D8 en celdas (1 o √2). */
export const D8_LENGTH = [1, Math.SQRT2, 1, Math.SQRT2, 1, Math.SQRT2, 1, Math.SQRT2] as const;
/** Sin dirección (océano o desagüe). */
export const NO_DIR = 255;

export interface Grid {
  readonly width: number;
  readonly height: number;
}

/** Vecino D8 `k` de la celda `i`, o −1 si sale por un polo. */
export function neighbor(g: Grid, i: number, k: number): number {
  const x = i % g.width;
  const y = (i - x) / g.width;
  const ny = y + (D8_DY[k] ?? 0);
  if (ny < 0 || ny >= g.height) return -1;
  const nx = (x + (D8_DX[k] ?? 0) + g.width) % g.width;
  return ny * g.width + nx;
}

/** Distancia E-O más corta entre dos columnas (con wrap), con signo de a hacia b. */
export function wrapDx(width: number, a: number, b: number): number {
  let d = b - a;
  if (d > width / 2) d -= width;
  else if (d < -width / 2) d += width;
  return d;
}

/** Latitud del centro de la fila y (grados; + norte). */
export function latitudeOf(height: number, y: number): number {
  return 90 - ((y + 0.5) * 180) / height;
}

/** Escala de un parámetro dado en celdas del mundo mediano al ancho actual. */
export function cells(width: number, mediumCells: number, referenceWidth = 2048): number {
  return (mediumCells * width) / referenceWidth;
}
