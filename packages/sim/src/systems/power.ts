// Fuerza y alcance de una polity (P1): derivados de la población y de las innovaciones de su
// capital. Los usan statecraft, diplomacy y military.
import { MinHeap } from '@ws/worldgen';
import { STATECRAFT, WAR } from '../config';
import type { SimContext } from '../context';
import { withInnovations } from '../stats';

function capitalBits(w: SimContext, polity: number): number {
  const capital = w.state.polity.get(polity)?.capital ?? 0;
  return capital === 0 ? 0 : (w.state.province.column('knownInnovations')[capital - 1] ?? 0);
}

/** Fuerza militar (score ≥ 0): ejército (persons) × efectos de las innovaciones de la capital. */
export function militaryStrength(w: SimContext, polity: number): number {
  const army = (w.derived.polityPopulation[polity] ?? 0) * WAR.armyShare;
  return withInnovations('combatStrength', army, capitalBits(w, polity));
}

/** Alcance administrativo (days) desde la capital. */
export function administrativeReach(w: SimContext, polity: number): number {
  return withInnovations('reach', STATECRAFT.reachDays, capitalBits(w, polity));
}

/** Provincias de una polity al inicio del tick (vista sin copia). */
export function provincesOf(w: SimContext, polity: number): Uint32Array {
  const { polityProvincesStart: start, polityProvinces } = w.derived;
  return polityProvinces.subarray(start[polity] ?? 0, start[polity + 1] ?? 0);
}

/** Vecinas de una polity al inicio del tick (vista sin copia). */
export function neighborsOfPolity(w: SimContext, polity: number): Uint32Array {
  const { polityNeighborsStart: start, polityNeighbors } = w.derived;
  return polityNeighbors.subarray(start[polity] ?? 0, start[polity + 1] ?? 0);
}

/**
 * Distancias desde la capital (days, Dijkstra por las provincias propias del inicio del tick) y
 * costo de llegar a cada provincia ajena lindera (frontera).
 */
export function capitalDistances(
  w: SimContext,
  polity: number,
): { readonly own: ReadonlyMap<number, number>; readonly frontier: ReadonlyMap<number, number> } {
  const capital = w.state.polity.get(polity)?.capital ?? 0;
  const own = new Map<number, number>();
  const frontier = new Map<number, number>();
  if (capital === 0) return { own, frontier };
  const owner = w.state.province.column('owner');
  const { offsets, neighbors, baseCost } = w.world.graph;
  own.set(capital, 0);
  const heap = new MinHeap(16);
  heap.push(capital, 0);
  while (heap.size > 0) {
    const d = heap.peekKey();
    const p = heap.pop();
    if (d > (own.get(p) ?? Infinity)) continue;
    for (let e = offsets[p] ?? 0; e < (offsets[p + 1] ?? 0); e++) {
      const q = neighbors[e] ?? 0;
      const nd = d + (baseCost[e] ?? 0);
      if ((owner[q - 1] ?? 0) === polity) {
        if (nd < (own.get(q) ?? Infinity)) {
          own.set(q, nd);
          heap.push(q, nd);
        }
      } else if (nd < (frontier.get(q) ?? Infinity)) {
        frontier.set(q, nd);
      }
    }
  }
  return { own, frontier };
}
