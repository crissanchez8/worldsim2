// Parámetros de URL del spike. Ejemplo: ?backend=webgl2&dpr=1&autostart=1
import { LOD_BASE_DISTANCE, LOD_STEPS, TOUR_DURATION_S } from './config';

export interface SpikeParams {
  /** `webgl2` fuerza el fallback; `auto` usa WebGPU si está disponible. */
  readonly backend: 'auto' | 'webgl2';
  readonly seed: number;
  /** Relación de píxeles del canvas; null = la del dispositivo (máx. 2). */
  readonly dpr: number | null;
  /** MSAA 4× (antialias del canvas). */
  readonly antialias: boolean;
  /** Mide el tiempo de GPU con timestamp queries (si el backend lo soporta). */
  readonly gpuTiming: boolean;
  /** Distancia base del LOD, en unidades. */
  readonly lodDistance: number;
  /** Fuerza un nivel de LOD en todos los chunks (peor caso con 0); null = por distancia. */
  readonly forcedLod: number | null;
  /** Arranca el recorrido de medición apenas termina la carga. */
  readonly autostart: boolean;
  /** Duración del recorrido, en s. */
  readonly duration: number;
  /**
   * Estrés: dibuja la escena N veces por cuadro. El N máximo que sostiene el refresco mide el
   * margen de GPU sin depender de timers ni del vsync.
   */
  readonly repeat: number;
  /** Precalienta pipelines y objetos de render de todas las mallas en la carga. */
  readonly warmup: boolean;
  /** Pose inicial de la cámara (celdas, unidades, rad); null = la de siempre. */
  readonly x: number | null;
  readonly z: number | null;
  readonly distance: number | null;
  readonly yaw: number | null;
}

function num(value: string | null, fallback: number, min: number, max: number): number {
  if (value === null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function opt(value: string | null): number | null {
  if (value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function flag(value: string | null, fallback: boolean): boolean {
  if (value === null) return fallback;
  return value === '' || value === '1' || value === 'true';
}

export function readParams(search: string): SpikeParams {
  const q = new URLSearchParams(search);
  const dpr = q.get('dpr');
  const lod = q.get('lod');
  return {
    backend: q.get('backend') === 'webgl2' ? 'webgl2' : 'auto',
    seed: Math.trunc(num(q.get('seed'), 1, 0, 0xffffffff)),
    dpr: dpr === null ? null : num(dpr, 1, 0.25, 3),
    antialias: flag(q.get('aa'), true),
    gpuTiming: flag(q.get('gpu'), true),
    lodDistance: num(q.get('lodDist'), LOD_BASE_DISTANCE, 10, 10_000),
    forcedLod: lod === null ? null : Math.trunc(num(lod, 0, 0, LOD_STEPS.length - 1)),
    autostart: flag(q.get('autostart'), false),
    duration: num(q.get('duration'), TOUR_DURATION_S, 1, 600),
    repeat: Math.trunc(num(q.get('repeat'), 1, 1, 16)),
    warmup: flag(q.get('warmup'), true),
    x: opt(q.get('x')),
    z: opt(q.get('z')),
    distance: opt(q.get('dist')),
    yaw: opt(q.get('yaw')),
  };
}
