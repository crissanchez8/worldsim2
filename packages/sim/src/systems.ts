// Sistemas del pipeline en el orden de las fases (docs/model.md §7). P1.3: la rebanada completa
// salvo chronicle, que llega con la historia (P1.4).
import type { SimSystem } from './context';
import { computeDerived } from './derive';
import { ledger } from './ledger';
import { characters, succession } from './systems/characters';
import { demography } from './systems/demography';
import { diplomacy } from './systems/diplomacy';
import { knowledge } from './systems/knowledge';
import { military } from './systems/military';
import { production } from './systems/production';
import { settlements } from './systems/settlements';
import { statecraft } from './systems/statecraft';

export const derive: SimSystem = {
  contract: {
    name: 'derive',
    phase: 'consolidation',
    cadence: { kind: 'annual' },
    reads: [
      'pop.province',
      'pop.culture',
      'pop.size',
      'province.owner',
      'province.knownInnovations',
      'polity.#rows',
    ],
    writes: [],
    emits: [],
  },
  run(w) {
    w.derived = computeDerived(w.state, w.world);
  },
};

/** Consolidación (fase 13): ledger → derive. */
export const CONSOLIDATION_SYSTEMS: readonly SimSystem[] = [ledger, derive];

export const DEFAULT_SYSTEMS: readonly SimSystem[] = [
  production, // 2 · producción
  demography, // 4 · consumo y salud
  knowledge, // 6 · conocimiento
  characters, // 7 · sociedad
  succession,
  statecraft, // 8 · estado
  diplomacy, // 9 · diplomacia
  military, // 10 · guerra (estacional)
  settlements, // 12 · asentamientos
  ...CONSOLIDATION_SYSTEMS, // 13 · ledger → derive
];
