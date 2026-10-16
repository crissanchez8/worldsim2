// Año sintético de referencia (hasta que P1 traiga el mundo real): 1.500 provincias × 10 pops
// con el pipeline del scheduler, deltas por buffer, ledger, eventos y hash cada 10 años.
// Mide el costo del "andamiaje" del motor; no es el presupuesto de P1.
import { performance } from 'node:perf_hooks';
import { events, math, rng, scheduler, serialize, store, time as calendar } from '@ws/core';
import { stats } from '../measure';
import type { Metric } from '../report';

interface Delta {
  readonly pop: number;
  readonly persons: number;
}

export function syntheticScenario(years: number): Metric[] {
  const provinces = 1500;
  const pop = store.createTable(
    store.defineSchema('pop', 1, {
      province: { type: 'ref', unit: 'id' },
      size: { type: 'f64', unit: 'persons' },
    }),
    { capacity: provinces * 10 },
  );
  for (let p = 1; p <= provinces; p++) {
    for (let k = 0; k < 10; k++) pop.add({ province: p, size: 1000 / (k + 1) });
  }
  const world = new store.Globals(
    store.defineSchema('world', 1, { year: { type: 'i32', unit: 'year' } }),
    {
      year: -12000,
    },
  );
  const deltas = scheduler.createBuffer<Delta>('popDeltas');
  const registry = new events.EventRegistry();
  const boom = registry.define<{ size: number }>({
    key: 'pop.boomed',
    threshold: 0.9,
    significance: (d) => (d.data.size > 1e5 ? 1 : 0),
  });
  const systems: scheduler.SystemDef<null>[] = [
    {
      contract: {
        name: 'growth',
        phase: 'consumption',
        cadence: { kind: 'annual' },
        reads: ['pop.size'],
        writes: [],
        emits: ['pop.boomed'],
        produces: ['popDeltas'],
      },
      run: (_w, tick) => {
        const size = pop.column('size');
        for (let row = 0; row < pop.rowCount; row++) {
          const id = pop.idAt(row);
          const u = rng.rngUniform(3, rng.Streams.bench, 1, id, tick.year, 0);
          const s = size[row] ?? 0;
          deltas.push({ pop: id, persons: s * math.expm1(0.001 * (u - 0.5)) });
          if (s > 1e5) tick.events.emit(boom, { actors: [{ kind: 'pop', id }], data: { size: s } });
        }
      },
    },
    {
      contract: {
        name: 'ledger',
        phase: 'consolidation',
        cadence: { kind: 'annual' },
        reads: [],
        writes: ['pop.size'],
        emits: [],
        consumes: ['popDeltas'],
      },
      run: () => {
        const size = pop.column('size');
        for (const d of deltas.drain()) {
          const row = pop.rowOf(d.pop);
          size[row] = (size[row] ?? 0) + d.persons;
        }
      },
    },
  ];
  const pipeline = scheduler.createPipeline(systems, [deltas]);
  const ids = new store.IdAllocator<'event'>();
  const yearMs: number[] = [];
  for (let i = 0; i < years; i++) {
    const year = world.get('year');
    const t0 = performance.now();
    pipeline.runTick(null, { year, events: new events.EventBus({ year, ids, checks: false }) });
    if (i % 10 === 0) serialize.hashState([world, pop]);
    yearMs.push(performance.now() - t0);
    world.set('year', calendar.nextYear(year));
  }
  const s = stats(yearMs.slice(Math.floor(years / 10))); // descarta el calentamiento del JIT
  return [
    { key: 'synthetic.msPerYear.avg', value: s.avg, unit: 'ms/año' },
    { key: 'synthetic.msPerYear.p95', value: s.p95, unit: 'ms/año' },
  ];
}
