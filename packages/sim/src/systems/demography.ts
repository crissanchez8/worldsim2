// demography v1 (P1.3; docs/model.md §9): nacimientos y muertes de cada pop según el alimento del
// año. Con alimento justo la población crece apenas (+0,1 %/año); con excedente, hasta ~1 %/año;
// con déficit, el hambre mata. Equilibrio maltusiano con cosechas variables (hambrunas).
// No hace: edades, salud, migración, estratos (P4).
import { math, rng } from '@ws/core';
import { PopDeltaKind, popDeltaCause } from '../buffers';
import { DEMOGRAPHY, PRODUCTION } from '../config';
import type { SimSystem } from '../context';
import { withInnovations } from '../stats';

const NATURAL = popDeltaCause('natural');
const FAMINE = popDeltaCause('famine');

/** Tasas anuales (per_year) de natalidad y mortalidad para una relación alimento/necesidad. */
export function vitalRates(ratio: number, bits: number): { birth: number; death: number } {
  const surplus = Math.min(1, Math.max(0, ratio - 1));
  const deficit = Math.max(0, 1 - ratio);
  const birth = withInnovations(
    'birthRate',
    DEMOGRAPHY.birthBase + DEMOGRAPHY.birthSurplusGain * surplus,
    bits,
  );
  const death = withInnovations(
    'deathRate',
    DEMOGRAPHY.deathBase + DEMOGRAPHY.famineMortality * deficit,
    bits,
  );
  return { birth, death };
}

export const demography: SimSystem = {
  contract: {
    name: 'demography',
    phase: 'consumption',
    cadence: { kind: 'annual' },
    reads: ['pop.province', 'pop.size', 'province.foodSecurity', 'province.knownInnovations'],
    writes: ['province.foodSecurity'],
    emits: ['famine.started', 'famine.ended'],
    consumes: ['productionOutput'],
    produces: ['popDeltas'],
  },
  run(w, tick) {
    const { pop, province } = w.state;
    const n = w.world.provinces.count;
    const seed = w.world.params.seed;
    const food = new Float64Array(n + 1);
    const out = w.buffers.productionOutput;
    const outProvince = out.column('province');
    const outFood = out.column('food');
    for (let i = 0; i < out.size; i++) {
      const p = outProvince[i] ?? 0;
      food[p] = (food[p] ?? 0) + (outFood[i] ?? 0);
    }
    out.clear();

    const security = province.column('foodSecurity');
    const bits = province.column('knownInnovations');
    const { provincePopulation, popRowsStart, popRows } = w.derived;
    const deltas = w.buffers.popDeltas;
    deltas.reserve(pop.size * 3);
    const popSize = pop.column('size');
    const dPop = deltas.column('pop');
    const dKind = deltas.column('kind');
    const dCause = deltas.column('cause');
    const dPersons = deltas.column('persons');
    const draw = rng.createRng(seed).stream(rng.Streams.demography);

    for (let p = 1; p <= n; p++) {
      const population = provincePopulation[p] ?? 0;
      if (population <= 0) continue;
      // Cosecha variable: ruido normal acotado a ±3σ.
      const noise = math.clamp(draw.at(p, tick.year).normal(), -3, 3) * DEMOGRAPHY.harvestNoiseSd;
      const ratio = ((food[p] ?? 0) * (1 + noise)) / (population * PRODUCTION.foodNeedT);
      const previous = security[p - 1] ?? 1;
      const now = Math.min(1, Math.max(0, ratio));
      security[p - 1] = now;
      if (previous >= DEMOGRAPHY.famineStartBelow && now < DEMOGRAPHY.famineStartBelow) {
        tick.events.emit(w.types.famineStarted, {
          actors: [],
          place: { kind: 'province', id: p },
          causes: [
            {
              kind: 'fact',
              entity: { kind: 'province', id: p },
              field: 'foodSecurity',
              year: tick.year,
            },
          ],
          data: { foodSecurity: now, population },
        });
      } else if (previous < DEMOGRAPHY.famineStartBelow && now > DEMOGRAPHY.famineEndAbove) {
        tick.events.emit(w.types.famineEnded, {
          actors: [],
          place: { kind: 'province', id: p },
          data: { population },
        });
      }

      const { birth, death } = vitalRates(ratio, bits[p - 1] ?? 0);
      const famineShare = death > 0 ? Math.max(0, death - DEMOGRAPHY.deathBase) / death : 0;
      for (let k = popRowsStart[p] ?? 0; k < (popRowsStart[p + 1] ?? 0); k++) {
        const row = popRows[k] ?? 0;
        const id = pop.idAt(row);
        const s = popSize[row] ?? 0;
        let i = deltas.append();
        dPop[i] = id;
        dKind[i] = PopDeltaKind.birth;
        dCause[i] = NATURAL;
        dPersons[i] = s * birth;
        const died = s * death;
        i = deltas.append();
        dPop[i] = id;
        dKind[i] = PopDeltaKind.death;
        dCause[i] = NATURAL;
        dPersons[i] = died * (1 - famineShare);
        if (famineShare > 0) {
          i = deltas.append();
          dPop[i] = id;
          dKind[i] = PopDeltaKind.death;
          dCause[i] = FAMINE;
          dPersons[i] = died * famineShare;
        }
      }
    }
  },
};
