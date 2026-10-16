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

/** ¿El cultivo rinde más que el forrajeo? */
function farmingFeedsMost(area: number, arable: number, hab: number, share: number, bits: number) {
  const cultivated = area * arable * share;
  const crop = withInnovations('cropYield', PRODUCTION.cropYieldT, bits) * cultivated;
  const forage =
    withInnovations('forageYield', PRODUCTION.forageYieldT, bits) * hab * (area - cultivated);
  return crop > forage;
}

/** Cuán agrícola es una provincia (fraction): cultivo relativo a lo que se trabaja con azada. */
export function agrarianShare(cropShare: number): number {
  return Math.min(1, cropShare / PRODUCTION.cropReachBase);
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
      const area_ = area[p] ?? 0;
      const arable = arableFraction[p] ?? 0;
      const hab = habitability[p] ?? 0;
      let share = crop[p - 1] ?? 0;
      if (knows(b, AGRICULTURE) && arable > 0) {
        const before = share;
        const reach = Math.min(1, withInnovations('cropReach', PRODUCTION.cropReachBase, b));
        share = Math.max(share, PRODUCTION.cropAdoptionSeed);
        if (share < reach) share += PRODUCTION.cropAdoptionRate * (reach - share);
        crop[p - 1] = share;
        // "La agricultura ya alimenta a la mayoría": el cultivo supera al forrajeo por primera vez.
        if (
          !farmingFeedsMost(area_, arable, hab, before, b) &&
          farmingFeedsMost(area_, arable, hab, share, b)
        ) {
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
      outFood[i] = provinceFood(area_, arable, hab, share, b);
    }
  },
};
