// Picking en CPU (funciones puras): rayo de cámara → punto del relieve (con la misma altura que
// dibuja la GPU) → celda → provincia por el ráster de ids. Sin three: se prueba en Node.
import type { WorldRaster } from '@ws/worldgen';
import { cellAt } from './wrap';

export interface Ray {
  readonly origin: readonly [number, number, number];
  /** Normalizada. */
  readonly direction: readonly [number, number, number];
}

export interface SurfaceHit {
  /** Punto de mundo, X sin envolver (la copia que ve la cámara). */
  readonly x: number;
  readonly z: number;
  readonly t: number;
}

/** Paso de la marcha sobre el rayo (celdas) y refinamientos por bisección (count). */
const MARCH_STEP_CELLS = 0.25;
const BISECTION_STEPS = 10;

/**
 * Primer cruce del rayo con la superficie `y = surfaceY(x, z)`, que vale entre 0 y `maxSurfaceY`.
 * Marcha desde donde el rayo baja de `maxSurfaceY` hasta donde toca y = 0 (ahí ya cruzó seguro) y
 * refina por bisección. `null` si el rayo no baja o no llega en `maxT`.
 */
export function raycastSurface(
  ray: Ray,
  surfaceY: (x: number, z: number) => number,
  maxSurfaceY: number,
  maxT: number,
): SurfaceHit | null {
  const [ox, oy, oz] = ray.origin;
  const [dx, dy, dz] = ray.direction;
  if (!(dy < 0)) return null;
  const tTop = Math.max(0, (oy - maxSurfaceY) / -dy);
  const tGround = Math.min(maxT, oy / -dy);
  if (tTop > tGround) return null;
  const above = (t: number) => oy + dy * t > surfaceY(ox + dx * t, oz + dz * t);
  let prev = tTop;
  if (!above(prev)) return { x: ox + dx * prev, z: oz + dz * prev, t: prev };
  for (let t = tTop + MARCH_STEP_CELLS; ; t += MARCH_STEP_CELLS) {
    const tt = Math.min(t, tGround);
    if (!above(tt)) {
      let lo = prev;
      let hi = tt;
      for (let i = 0; i < BISECTION_STEPS; i++) {
        const mid = (lo + hi) / 2;
        if (above(mid)) lo = mid;
        else hi = mid;
      }
      return { x: ox + dx * hi, z: oz + dz * hi, t: hi };
    }
    if (tt >= tGround) return null;
    prev = tt;
  }
}

export interface CellPick {
  /** Celda del ráster (x ya envuelta). */
  readonly cellX: number;
  readonly cellY: number;
  /** id de provincia; 0 = agua. */
  readonly province: number;
  /** `Water` del worldgen: 0 tierra, 1 océano, 2 lago. */
  readonly water: number;
  /** Índice de `Biomes`; 255 en el agua. */
  readonly biome: number;
}

/** Lo que hay en el punto de mundo (X, Z) según el ráster (con wrap E-O). */
export function pickCell(
  raster: Pick<WorldRaster, 'width' | 'height' | 'province' | 'water' | 'biome'>,
  worldX: number,
  worldZ: number,
): CellPick | null {
  const cell = cellAt(raster.width, raster.height, worldX, worldZ);
  if (!cell) return null;
  const i = cell.y * raster.width + cell.x;
  return {
    cellX: cell.x,
    cellY: cell.y,
    province: raster.province[i] ?? 0,
    water: raster.water[i] ?? 0,
    biome: raster.biome[i] ?? 255,
  };
}
