import { createGridWorld, neighborsOf } from '@ws/worldgen';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CONSOLIDATION_SYSTEMS, computeDerived, Sim } from './index';
import { testLoad } from './test-support/load';

// Las vistas en CSR tienen que coincidir con un cálculo ingenuo (con Map y Set) del mismo estado.
describe('derive (CSR) contra un cálculo ingenuo', () => {
  it('población, pops por provincia, provincias y vecinos por polity', () => {
    const world = createGridWorld({ seed: 4, width: 10, height: 5 });
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 150 }),
        (seed, years) => {
          const sim = Sim.create(
            world,
            {},
            { systems: [...testLoad(seed), ...CONSOLIDATION_SYSTEMS] },
          );
          for (let i = 0; i < years; i++) sim.step();
          const { state } = sim.ctx;
          const d = computeDerived(state, world);

          const popByProvince = new Map<number, number>();
          const rowsByProvince = new Map<number, number[]>();
          for (const row of state.pop.rows()) {
            const p = state.pop.column('province')[row] ?? 0;
            popByProvince.set(
              p,
              (popByProvince.get(p) ?? 0) + (state.pop.column('size')[row] ?? 0),
            );
            rowsByProvince.set(p, [...(rowsByProvince.get(p) ?? []), row]);
          }
          const owner = state.province.column('owner');
          const provincesByPolity = new Map<number, number[]>();
          const neighborsByPolity = new Map<number, Set<number>>();
          for (let p = 1; p <= world.provinces.count; p++) {
            expect(d.provincePopulation[p]).toBe(popByProvince.get(p) ?? 0);
            const rows = [...d.popRows.subarray(d.popRowsStart[p], d.popRowsStart[p + 1])];
            expect(rows).toEqual(rowsByProvince.get(p) ?? []);
            const o = owner[p - 1] ?? 0;
            if (o === 0) continue;
            provincesByPolity.set(o, [...(provincesByPolity.get(o) ?? []), p]);
            for (const q of neighborsOf(world.graph, p)) {
              const b = owner[q - 1] ?? 0;
              if (b === 0 || b === o) continue;
              const set = neighborsByPolity.get(o) ?? new Set<number>();
              set.add(b);
              neighborsByPolity.set(o, set);
            }
          }
          for (let a = 0; a < state.polity.allocator.peek(); a++) {
            const provinces = [
              ...d.polityProvinces.subarray(
                d.polityProvincesStart[a],
                d.polityProvincesStart[a + 1],
              ),
            ];
            expect(provinces).toEqual(provincesByPolity.get(a) ?? []);
            const neighbors = [
              ...d.polityNeighbors.subarray(
                d.polityNeighborsStart[a],
                d.polityNeighborsStart[a + 1],
              ),
            ];
            expect(neighbors).toEqual([...(neighborsByPolity.get(a) ?? [])].sort((x, y) => x - y));
            const pop = provinces.reduce((s, p) => s + (d.provincePopulation[p] ?? 0), 0);
            expect(d.polityPopulation[a] ?? 0).toBeCloseTo(pop, 6);
          }
        },
      ),
      { numRuns: 20 },
    );
  });
});
