// Invariantes globales (docs/model.md §12) que se verifican al final de cada tick en dev y tests.
// I1 lo garantiza `IdAllocator`, I9 el pipeline y el resto llega con sus sistemas.
import { LEDGER } from './config';
import type { SimContext } from './context';
import { isActivePolity, type SimState } from './state';

export class InvariantError extends Error {
  override name = 'InvariantError';
}

/** Población total viva (persons). */
export function totalPopulation(state: SimState): number {
  const { pop } = state;
  const size = pop.column('size');
  let total = 0;
  for (let row = 0; row < pop.rowCount; row++) if (pop.aliveAt(row)) total += size[row] ?? 0;
  return total;
}

/**
 * Verifica los invariantes del estado al final de un tick. `populationBefore` es la población
 * total al inicio del tick (para I2). Lanza `InvariantError` con el primero que falle.
 */
export function checkInvariants(ctx: SimContext, populationBefore: number): void {
  const { state, world, ledger } = ctx;
  const { pop, province, polity } = state;
  const n = world.provinces.count;

  // I2 · conservación: Σ después = Σ antes + nacimientos − muertes (toda causa).
  let died = 0;
  for (const d of ledger.deaths) died += d;
  const after = totalPopulation(state);
  const expected = populationBefore + ledger.births - died;
  const tolerance = LEDGER.conservationTolerance * Math.max(1, populationBefore);
  if (!(Math.abs(after - expected) <= tolerance)) {
    throw new InvariantError(
      `I2: población ${after}, esperada ${expected} (Δ ${after - expected})`,
    );
  }

  // I3, I5, I6 e I10 sobre los pops.
  const pp = pop.column('province');
  const pc = pop.column('culture');
  const pr = pop.column('religion');
  const ps = pop.column('stratum');
  const size = pop.column('size');
  const keys = new Set<string>();
  for (let row = 0; row < pop.rowCount; row++) {
    if (!pop.aliveAt(row)) continue;
    const id = pop.idAt(row);
    const s = size[row] ?? 0;
    if (!Number.isFinite(s)) throw new InvariantError(`I10: pop ${id} con tamaño ${s}`);
    if (s < LEDGER.minPopSize) throw new InvariantError(`I3: pop ${id} con ${s} personas`);
    const p = pp[row] ?? 0;
    if (p < 1 || p > n) throw new InvariantError(`I6: pop ${id} en la provincia ${p}`);
    const key = `${p}:${pc[row] ?? 0}:${pr[row] ?? 0}:${ps[row] ?? 0}`;
    if (keys.has(key)) throw new InvariantError(`I5: clave de pop repetida ${key}`);
    keys.add(key);
  }

  // I4 · cada provincia tiene un dueño activo o ninguno.
  if (province.size !== n) throw new InvariantError(`provincias: ${province.size} de ${n}`);
  const owner = province.column('owner');
  for (let p = 1; p <= n; p++) {
    const o = owner[p - 1] ?? 0;
    if (o !== 0 && !isActivePolity(state, o)) {
      throw new InvariantError(`I4: la provincia ${p} tiene un dueño inactivo (${o})`);
    }
  }

  // I6 · capitales de polities activas.
  for (const [id, record] of polity.entries()) {
    if (record.ended !== 0) continue;
    if (record.capital < 0 || record.capital > n) {
      throw new InvariantError(`I6: polity ${id} con capital ${record.capital}`);
    }
  }
}
