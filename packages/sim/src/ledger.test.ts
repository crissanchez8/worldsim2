import { createGridWorld } from '@ws/worldgen';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  CONSOLIDATION_SYSTEMS,
  LedgerError,
  PopDeltaKind,
  popDeltaCause,
  Sim,
  type SimContext,
  type SimSystem,
  territoryCause,
  totalPopulation,
} from './index';

const world = createGridWorld({ seed: 1, width: 6, height: 4 });

/** Un sistema que, en su tick, ejecuta `produce` (el resto del pipeline es el real). */
function withProducer(
  produce: (w: SimContext, year: number) => void,
  writes: readonly string[] = [],
): Sim {
  const producer: SimSystem = {
    contract: {
      name: 'producer',
      phase: 'consumption',
      cadence: { kind: 'annual' },
      reads: [],
      writes,
      emits: [],
      produces: ['popDeltas', 'territoryRequests'],
    },
    run: (w, tick) => {
      produce(w, tick.year);
    },
  };
  return Sim.create(world, {}, { checks: true, systems: [producer, ...CONSOLIDATION_SYSTEMS] });
}

/** Pop de una provincia con la cultura dada (por defecto, la de su pop original). */
function popOf(sim: Sim, province: number, culture?: number) {
  const { pop } = sim.ctx.state;
  const native = sim.ctx.derived.majorityCulture[province] ?? 0;
  const wanted = culture ?? native;
  for (const row of pop.rows()) {
    if (pop.column('province')[row] === province && pop.column('culture')[row] === wanted) {
      return { id: pop.idAt(row), size: pop.column('size')[row] ?? 0 };
    }
  }
  return undefined;
}

const firstPop = (w: SimContext) => w.state.pop.idAt(0);

describe('ledger · población', () => {
  it('nacimientos y muertes sobre el tamaño del inicio del tick, con contabilidad por causa', () => {
    let pop = 0;
    let before = 0;
    const sim = withProducer((w) => {
      pop = firstPop(w);
      before = w.state.pop.get(pop, 'size');
      w.buffers.popDeltas.push({ pop, kind: PopDeltaKind.birth, persons: 10 });
      w.buffers.popDeltas.push({
        pop,
        kind: PopDeltaKind.death,
        cause: popDeltaCause('famine'),
        persons: 4,
      });
    });
    const r = sim.step();
    expect(sim.ctx.state.pop.get(pop, 'size')).toBeCloseTo(before + 6, 9);
    expect(r.tally.births).toBe(10);
    expect(r.tally.deaths[popDeltaCause('famine')]).toBe(4);
  });

  it('nadie muere dos veces: muertes mayores que el pop se escalan y el pop desaparece', () => {
    let pop = 0;
    let province = 0;
    let size = 0;
    const sim = withProducer((w, year) => {
      if (year !== -12000) return;
      pop = firstPop(w);
      province = w.state.pop.get(pop, 'province');
      size = w.state.pop.get(pop, 'size');
      w.buffers.popDeltas.push({ pop, kind: PopDeltaKind.death, cause: 2, persons: size * 2 });
      w.buffers.popDeltas.push({ pop, kind: PopDeltaKind.death, cause: 3, persons: size * 2 });
    });
    const r = sim.step();
    expect(sim.ctx.state.pop.has(pop)).toBe(false);
    expect(popOf(sim, province)).toBeUndefined();
    // la mitad por cada causa (proporcional), el total = lo que había
    expect(r.tally.deaths[2]).toBeCloseTo(size / 2, 9);
    expect(r.tally.deaths[3]).toBeCloseTo(size / 2, 9);
    expect(r.tally.popsRemoved).toBe(1);
  });

  it('una transferencia crea el pop destino una sola vez y conserva personas', () => {
    let pop = 0;
    let province = 0;
    const sim = withProducer((w, year) => {
      if (year !== -12000) return;
      pop = firstPop(w);
      province = w.state.pop.get(pop, 'province');
      for (let k = 0; k < 2; k++) {
        w.buffers.popDeltas.push({
          pop,
          kind: PopDeltaKind.transfer,
          cause: popDeltaCause('assimilation'),
          persons: 5,
          toProvince: province,
          toCulture: 7,
        });
      }
    });
    const total = totalPopulation(sim.ctx.state);
    const r = sim.step();
    expect(popOf(sim, province, 7)?.size).toBe(10);
    expect(r.tally.popsCreated).toBe(1);
    expect(r.tally.transferred).toBe(10);
    expect(totalPopulation(sim.ctx.state)).toBeCloseTo(total, 6);
  });

  it('transferencias mayores que lo disponible se escalan', () => {
    let pop = 0;
    let province = 0;
    let size = 0;
    const sim = withProducer((w, year) => {
      if (year !== -12000) return;
      pop = firstPop(w);
      province = w.state.pop.get(pop, 'province');
      size = w.state.pop.get(pop, 'size');
      w.buffers.popDeltas.push({
        pop,
        kind: PopDeltaKind.transfer,
        persons: size * 4,
        toProvince: province,
        toCulture: 3,
      });
    });
    sim.step();
    expect(sim.ctx.state.pop.has(pop)).toBe(false);
    expect(popOf(sim, province, 3)?.size).toBeCloseTo(size, 9);
  });

  it('un pop de menos de 1 persona se fusiona con el más parecido de su provincia (I3)', () => {
    let pop = 0;
    let province = 0;
    const sim = withProducer((w, year) => {
      if (year !== -12000) return;
      pop = firstPop(w);
      province = w.state.pop.get(pop, 'province');
      // 0,5 personas a la cultura 5 (nuevo, < 1): se vuelve a fusionar con el pop original
      w.buffers.popDeltas.push({
        pop,
        kind: PopDeltaKind.transfer,
        persons: 0.5,
        toProvince: province,
        toCulture: 5,
      });
    });
    const before = totalPopulation(sim.ctx.state);
    const r = sim.step();
    expect(popOf(sim, province, 5)).toBeUndefined();
    expect(totalPopulation(sim.ctx.state)).toBeCloseTo(before, 6);
    expect(r.tally.popsCreated).toBe(1);
    expect(r.tally.popsRemoved).toBe(1);
  });

  it('un delta a un pop inexistente es un error', () => {
    const sim = withProducer((w) => {
      w.buffers.popDeltas.push({ pop: 999_999, kind: PopDeltaKind.birth, persons: 1 });
    });
    expect(() => sim.step()).toThrow(LedgerError);
  });
});

describe('ledger · territorio', () => {
  function withPolities(requests: (w: SimContext, ids: readonly number[]) => void): {
    sim: Sim;
    ids: number[];
  } {
    const ids: number[] = [];
    const sim = withProducer(
      (w, year) => {
        if (year !== -12000) return;
        for (let k = 0; k < 3; k++) ids.push(w.state.polity.add({ founded: year, capital: k + 1 }));
        requests(w, ids);
      },
      ['polity.*'],
    );
    return { sim, ids };
  }

  it('gana la mayor prioridad; a igual prioridad, la primera; el evento cuenta las perdedoras', () => {
    const { sim, ids } = withPolities((w, [a = 0, b = 0, c = 0]) => {
      const t = w.buffers.territoryRequests;
      t.push({ province: 1, newOwner: a, cause: territoryCause('expansion') });
      t.push({ province: 1, newOwner: b, cause: territoryCause('formation') });
      t.push({ province: 1, newOwner: c, cause: territoryCause('absorption') }); // igual que b
      t.push({ province: 2, newOwner: c, cause: territoryCause('expansion') });
      t.push({ province: 2, newOwner: a, cause: territoryCause('expansion') });
    });
    const r = sim.step();
    const owner = sim.ctx.state.province.column('owner');
    expect(owner[0]).toBe(ids[1]);
    expect(owner[1]).toBe(ids[2]);
    const changed = r.events.filter((e) => e.type === 'territory.changed');
    expect(changed.map((e) => e.place?.id)).toEqual([1, 2]); // en orden de provincia
    expect(changed[0]?.data).toMatchObject({
      from: 0,
      to: ids[1],
      cause: 'formation',
      overruled: 2,
    });
  });

  it('no se puede dar una provincia a una polity terminada (I4)', () => {
    const { sim } = withPolities((w, [a = 0]) => {
      w.state.polity.set(a, 'ended', -12000);
      w.buffers.territoryRequests.push({ province: 1, newOwner: a, cause: 0 });
    });
    expect(() => sim.step()).toThrow(LedgerError);
  });
});

describe('ledger · propiedades', () => {
  it('con deltas al azar (incluidos excesos), se cumplen I2, I3 e I5 en cada tick', () => {
    const delta = fc.record({
      who: fc.nat(),
      kind: fc.constantFrom(PopDeltaKind.birth, PopDeltaKind.death, PopDeltaKind.transfer),
      factor: fc.oneof(fc.double({ min: 0, max: 0.5, noNaN: true }), fc.constant(3)),
      toProvince: fc.integer({ min: 1, max: world.provinces.count }),
      toCulture: fc.integer({ min: 0, max: 3 }),
    });
    fc.assert(
      fc.property(
        fc.array(fc.array(delta, { maxLength: 40 }), { minLength: 1, maxLength: 6 }),
        (years) => {
          let tick = 0;
          const sim = withProducer((w) => {
            const list = years[tick++] ?? [];
            const { pop } = w.state;
            const ids = [...pop.ids()];
            for (const d of list) {
              const id = ids[d.who % ids.length] ?? 0;
              w.buffers.popDeltas.push({
                pop: id,
                kind: d.kind,
                persons: pop.get(id, 'size') * d.factor,
                toProvince: d.toProvince,
                toCulture: d.toCulture,
              });
            }
          });
          // checks: true → checkInvariants después de cada tick (lanza InvariantError)
          for (const _ of years) {
            expect(() => sim.step()).not.toThrow();
          }
        },
      ),
      { numRuns: 60 },
    );
  });
});
