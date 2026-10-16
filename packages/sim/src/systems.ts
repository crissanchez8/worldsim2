// Sistemas del pipeline en orden (docs/model.md §7). P1.0: solo la consolidación (ledger →
// derive); P1.3 agrega production, demography, knowledge, characters, succession, statecraft,
// diplomacy, military, settlements y chronicle.
import type { SimSystem } from './context';
import { computeDerived } from './derive';
import { ledger } from './ledger';

export const derive: SimSystem = {
  contract: {
    name: 'derive',
    phase: 'consolidation',
    cadence: { kind: 'annual' },
    reads: ['pop.province', 'pop.size', 'province.owner', 'polity.#rows'],
    writes: [],
    emits: [],
  },
  run(w) {
    w.derived = computeDerived(w.state, w.world);
  },
};

export const DEFAULT_SYSTEMS: readonly SimSystem[] = [ledger, derive];
