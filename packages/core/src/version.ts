/**
 * Versión del motor (semver). Un seed reproduce el mismo mundo solo dentro de la misma
 * versión del motor (DEVELOPMENT_PLAN §8.3). Se sube con cada cambio intencional del golden
 * de simulación o del mundo (BRIEF P1, P1.0): 0.1.0 = primer golden de simulación (P1.0);
 * 0.1.1 = worldgen v1 (P1.1); 0.1.2 = simulación v1 (P1.3); 0.1.3 = calibración con
 * `ws health` (P1.8).
 */
export const ENGINE_VERSION = '0.1.3';
