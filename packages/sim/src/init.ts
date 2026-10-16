// Estado inicial de la corrida (D11: ≈12.000 a.C., mundo ya poblado). Versión de P1.0: bandas de
// forrajeros en toda la tierra habitable, sin culturas ni polities. P1.3 agrega los focos de
// cultura con sus idiomas y calibra la densidad contra el Apéndice A.
import { Strata } from '@ws/content';
import type { WorldStatic } from '@ws/worldgen';
import { INITIAL_STATE, LEDGER } from './config';
import type { SimState } from './state';

export interface SimParams {
  /** year (por defecto −12000). */
  readonly startYear: number;
  /** year (por defecto 1900). */
  readonly endYear: number;
}

/** Las dos mitades del hash del mundo estático (16 hex → 2 × u32). */
export function splitHash(hex: string): readonly [number, number] {
  if (!/^[0-9a-f]{16}$/.test(hex)) throw new Error(`hash inválido: ${hex}`);
  return [Number.parseInt(hex.slice(0, 8), 16), Number.parseInt(hex.slice(8), 16)];
}

export function initialize(state: SimState, world: WorldStatic, params: SimParams): void {
  const [hashA, hashB] = splitHash(world.hash);
  state.world.set('year', params.startYear);
  state.world.set('startYear', params.startYear);
  state.world.set('endYear', params.endYear);
  state.world.set('nextEventId', 1);
  state.world.set('staticHashA', hashA);
  state.world.set('staticHashB', hashB);

  const { count, area, habitability } = world.provinces;
  for (let p = 1; p <= count; p++) {
    const id = state.province.add({ owner: 0 });
    if (id !== p) throw new Error(`provincia ${p}: id ${id} (las ids tienen que coincidir)`);
  }

  const common = Strata.indexOf('common');
  for (let p = 1; p <= count; p++) {
    const persons = (area[p] ?? 0) * (habitability[p] ?? 0) * INITIAL_STATE.foragerDensity;
    if (persons < LEDGER.minPopSize) continue;
    state.pop.add({ province: p, culture: 0, religion: 0, stratum: common, size: persons });
  }
}
