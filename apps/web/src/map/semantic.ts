// Zoom semántico v0 (puro): de la distancia de la cámara salen los parámetros que leen los
// shaders. De lejos plano coloreado, de cerca relieve.
import { BORDERS, RIVERS, scaleForWidth, SEMANTIC_ZOOM, SHADING_EXAGGERATION } from './config';

export interface SemanticState {
  /** 1 = relieve completo, 0 = plano (adimensional). */
  readonly relief: number;
  /** Elevación (m) → altura en el mundo (celdas), con exageración y relieve. */
  readonly heightScale: number;
  /** Lo mismo, solo para el sombreado (con exageración extra y piso de sombreado). */
  readonly shadeScale: number;
  /** Opacidad del relleno de provincias (fraction). */
  readonly fillOpacity: number;
  /** Opacidad de las fronteras de provincia (fraction). */
  readonly provinceBorderAlpha: number;
  /** Caudal relativo mínimo de los ríos visibles (0–1). */
  readonly riverMinT: number;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * @param distance distancia cámara-objetivo (celdas)
 * @param width ancho del mundo (celdas): escala las distancias de referencia
 * @param metersPerCell lado de una celda (m)
 * @param exaggeration exageración vertical (adimensional)
 */
export function semanticState(
  distance: number,
  width: number,
  metersPerCell: number,
  exaggeration: number,
): SemanticState {
  const s = scaleForWidth(width);
  const z = SEMANTIC_ZOOM;
  const relief = smoothstep(z.reliefFlatDistance * s, z.reliefFullDistance * s, distance);
  const metersToUnits = exaggeration / metersPerCell;
  const far = 1 - relief;
  return {
    relief,
    heightScale: metersToUnits * relief,
    shadeScale:
      metersToUnits * SHADING_EXAGGERATION * (z.flatShading + (1 - z.flatShading) * relief),
    fillOpacity: z.fillNear + (z.fillFar - z.fillNear) * far,
    provinceBorderAlpha:
      BORDERS.provinceAlpha *
      smoothstep(z.provinceBordersHidden * s, z.provinceBordersFull * s, distance),
    riverMinT: RIVERS.farMinFlowT * far,
  };
}
