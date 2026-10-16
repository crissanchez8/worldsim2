// Reporte de carga y rendimiento del mapa, legible desde la consola o desde automatización
// (`window.__map`, scripts/measure-map.mjs). No es UI: no lleva textos.
import type { FrameSummary } from './bench/metrics';

export interface MapReport {
  readonly userAgent: string;
  backend: string;
  forcedWebGL2: boolean;
  world: {
    seed: number;
    size: string;
    mapType: string;
    landFraction: number;
    hash: string;
    width: number;
    height: number;
    provinces: number;
  } | null;
  canvas: { width: number; height: number; dpr: number } | null;
  antialias: boolean;
  /** Tiempos de la primera carga (ms). `firstFrameAt` es desde el inicio de la navegación. */
  load: {
    rendererInitMs: number;
    worldgenMs: number;
    worldgenWallMs: number;
    transferMs: number;
    mapDataMs: number;
    gpuBuildMs: number;
    warmupMs: number;
    /** Espera a que la GPU termine el precalentado (compilación de pipelines en la GPU). */
    gpuWarmupMs: number;
    firstFrameMs: number;
    firstFrameAt: number;
  };
  /** Cuadros de los primeros segundos después del primer cuadro (congelamientos de la carga). */
  settle: FrameSummary | null;
  refreshHz: number;
  memory: {
    threeTexturesBytes: number;
    threeBuffersBytes: number;
    mapTexturesBytes: number;
    terrainGeometryBytes: number;
    riverBytes: number;
  } | null;
  scene: {
    chunks: number;
    riverLines: number;
    riverVertices: number;
    settlements: number;
    battles: number;
  } | null;
  repeat: number;
  /** Recorrido scripteado (`?tour=1`). */
  tour: FrameSummary | null;
  error: string | null;
}

export function createReport(): MapReport {
  return {
    userAgent: navigator.userAgent,
    backend: '',
    forcedWebGL2: false,
    world: null,
    canvas: null,
    antialias: true,
    load: {
      rendererInitMs: NaN,
      worldgenMs: NaN,
      worldgenWallMs: NaN,
      transferMs: NaN,
      mapDataMs: NaN,
      gpuBuildMs: NaN,
      warmupMs: NaN,
      gpuWarmupMs: NaN,
      firstFrameMs: NaN,
      firstFrameAt: NaN,
    },
    settle: null,
    refreshHz: NaN,
    memory: null,
    scene: null,
    repeat: 1,
    tour: null,
    error: null,
  };
}

declare global {
  interface Window {
    __map?: MapReport;
  }
}
