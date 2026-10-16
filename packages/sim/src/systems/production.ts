// production v1 (P1.3; docs/model.md §9): subsistencia en dos usos del suelo. El forrajeo rinde
// según la habitabilidad; el cultivo, en la tierra cultivable, una vez conocida la agricultura,
// que se adopta de a poco. Produce el alimento del año (tons) para demography.
// No hace: pastoreo como uso propio, bienes, métodos de producción (P4/P6).
import type { SimSystem } from '../context';
import { PRODUCTION } from '../config';
import { innovationBit, knows, withInnovations } from '../stats';

const AGRICULTURE = innovationBit('agriculture');

/** Alimento del año (tons) de una provincia con su cultivo y sus innovaciones. */
export function provinceFood(
  areaKm2: number,
  arable: number,
  habitability: number,
  cropShare: number,
  bits: number,
): number {
  const cultivated = areaKm2 * arable * cropShare;
  const foraged = areaKm2 - cultivated;
  const forage = withInnovations('forageYield', PRODUCTION.forageYieldT, bits) * habitability;
  const crop = withInnovations('cropYield', PRODUCTION.cropYieldT, bits);
  return foraged * forage + cultivated * crop;
}

export const production: SimSystem = {
  contract: {
    name: 'production',
    phase: 'production',
    cadence: { kind: 'annual' },
    reads: ['province.knownInnovations', 'province.cropShare', 'pop.province', 'pop.size'],
    writes: ['province.cropShare'],
    emits: ['subsistence.shifted'],
    produces: ['productionOutput'],
  },
  run(w, tick) {
    const { province } = w.state;
    const { count, area, arableFraction, habitability } = w.world.provinces;
    const crop = province.column('cropShare');
    const bits = province.column('knownInnovations');
    const out = w.buffers.productionOutput;
    out.reserve(count);
    const outProvince = out.column('province');
    const outFood = out.column('food');
    for (let p = 1; p <= count; p++) {
      const b = bits[p - 1] ?? 0;
      let share = crop[p - 1] ?? 0;
      if (knows(b, AGRICULTURE) && (arableFraction[p] ?? 0) > 0) {
        const before = share;
        share = Math.max(share, PRODUCTION.cropAdoptionSeed);
        share += PRODUCTION.cropAdoptionRate * (1 - share);
        crop[p - 1] = share;
        if (before < PRODUCTION.agriculturalMajority && share >= PRODUCTION.agriculturalMajority) {
          tick.events.emit(w.types.subsistenceShifted, {
            actors: [],
            place: { kind: 'province', id: p },
            causes: [
              {
                kind: 'fact',
                entity: { kind: 'province', id: p },
                field: 'knownInnovations',
                year: tick.year,
              },
            ],
            data: { cropShare: share, population: w.derived.provincePopulation[p] ?? 0 },
          });
        }
      }
      const i = out.append();
      outProvince[i] = p;
      outFood[i] = provinceFood(
        area[p] ?? 0,
        arableFraction[p] ?? 0,
        habitability[p] ?? 0,
        share,
        b,
      );
    }
  },
};
