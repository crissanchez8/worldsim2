// URL de un mundo (P1.6; P1.7 le suma la versión del motor): los parámetros del worldgen y, si se
// continúa un mundo guardado, su id.
import type { WorldParams } from '@ws/worldgen';

export function worldSearch(params: WorldParams, load?: number): string {
  const q = new URLSearchParams({
    seed: String(params.seed),
    size: params.size,
    map: params.mapType,
    land: String(params.landFraction),
  });
  if (load !== undefined) q.set('load', String(load));
  return `?${q.toString()}`;
}

/** Identidad del mundo abierto: si cambia, se regenera y se arranca otra simulación. */
export function worldKey(params: WorldParams, load: number | null): string {
  return `${params.seed}|${params.size}|${params.mapType}|${params.landFraction}|${load ?? ''}`;
}
