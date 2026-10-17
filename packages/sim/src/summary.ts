// Resumen del mundo en un momento (para `ws run`, `ws health` y los agregados de la historia).
// Función pura del estado y de las vistas derivadas: no es estado.
import { Eras, Innovations } from '@ws/content';
import type { SimContext } from './context';
import { totalPopulation } from './invariants';

export interface WorldSummary {
  readonly year: number;
  /** persons. */
  readonly population: number;
  /** Provincias que conocen la agricultura (count). */
  readonly farmingProvinces: number;
  /** Asentamientos por nivel (count, índice de SettlementLevels). */
  readonly settlementsByLevel: readonly number[];
  /** Población urbana / total (fraction). */
  readonly urbanization: number;
  readonly activePolities: number;
  /** Población de la polity más grande (persons). */
  readonly largestPolity: number;
  /** Fracción de provincias con dueño (fraction). */
  readonly ownedShare: number;
  readonly activeWars: number;
  /** Claves de las innovaciones conocidas en algún lugar. */
  readonly innovations: readonly string[];
  /** Era dominante: la más avanzada que alcanza al menos `dominantShare` de la población (D48). */
  readonly dominantEra: string;
}

/** Parte de la población que tiene que estar en una era para que sea la dominante (fraction, D48). */
export const DOMINANT_ERA_SHARE = 0.1;

const ERA_MASKS = Eras.rows.map((era) =>
  era.enteredBy.reduce((m, key) => m | (1 << Innovations.indexOf(key)), 0),
);

/** Era de un conjunto de innovaciones (índice de Eras). */
export function eraOf(bits: number): number {
  let era = 0;
  ERA_MASKS.forEach((mask, i) => {
    if (mask !== 0 && (bits & mask) !== 0) era = i;
  });
  return era;
}

/**
 * Era dominante (índice de Eras): la más avanzada que alcanza al menos DOMINANT_ERA_SHARE de la
 * población. Barata (una pasada por provincias): la usan los agregados por año y el ritmo (D48).
 */
export function dominantEra(w: SimContext, population = totalPopulation(w.state)): number {
  const n = w.world.provinces.count;
  const bits = w.state.province.column('knownInnovations');
  const eraPopulation = new Float64Array(Eras.rows.length);
  for (let p = 1; p <= n; p++) {
    const e = eraOf(bits[p - 1] ?? 0);
    eraPopulation[e] = (eraPopulation[e] ?? 0) + (w.derived.provincePopulation[p] ?? 0);
  }
  let reached = 0;
  for (let e = Eras.rows.length - 1; e >= 0; e--) {
    reached += eraPopulation[e] ?? 0;
    if (reached >= DOMINANT_ERA_SHARE * population) return e;
  }
  return 0;
}

export function summarize(w: SimContext, year: number): WorldSummary {
  const { province, settlement, polity, war } = w.state;
  const n = w.world.provinces.count;
  const population = totalPopulation(w.state);
  const bits = province.column('knownInnovations');
  const owner = province.column('owner');
  const agriculture = 1 << Innovations.indexOf('agriculture');
  let farming = 0;
  let owned = 0;
  for (let p = 1; p <= n; p++) {
    if (((bits[p - 1] ?? 0) & agriculture) !== 0) farming++;
    if ((owner[p - 1] ?? 0) !== 0) owned++;
  }
  const dominant = dominantEra(w, population);
  const byLevel = new Array<number>(5).fill(0);
  let urban = 0;
  for (const row of settlement.rows()) {
    const level = settlement.column('level')[row] ?? 0;
    byLevel[level] = (byLevel[level] ?? 0) + 1;
    const p = settlement.column('province')[row] ?? 0;
    urban += (w.derived.provincePopulation[p] ?? 0) * (settlement.column('urbanShare')[row] ?? 0);
  }
  let active = 0;
  let largest = 0;
  for (const [id, rec] of polity.entries()) {
    if (rec.ended !== 0) continue;
    active++;
    largest = Math.max(largest, w.derived.polityPopulation[id] ?? 0);
  }
  let wars = 0;
  for (const [, rec] of war.entries()) if (rec.ended === 0) wars++;
  const world = w.derived.worldInnovations;
  return {
    year,
    population,
    farmingProvinces: farming,
    settlementsByLevel: byLevel,
    urbanization: population > 0 ? urban / population : 0,
    activePolities: active,
    largestPolity: largest,
    ownedShare: n > 0 ? owned / n : 0,
    activeWars: wars,
    innovations: Innovations.rows.filter((_, i) => (world & (1 << i)) !== 0).map((r) => r.key),
    dominantEra: Eras.rows[dominant]?.key ?? 'prehistory',
  };
}
