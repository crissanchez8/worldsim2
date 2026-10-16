// Microbenchmarks de las primitivas de @ws/core: los costos unitarios que suma el motor.
import { ENGINE_VERSION, math, rng, scheduler, serialize, store, events } from '@ws/core';
import { consume, stats, time } from '../measure';
import type { Metric } from '../report';

function popTable(n: number) {
  const schema = store.defineSchema('pop', 1, {
    province: { type: 'ref', unit: 'id' },
    culture: { type: 'u16', unit: 'enum' },
    size: { type: 'f64', unit: 'persons' },
    wealth: { type: 'f64', unit: 'coins' },
    literacy: { type: 'f32', unit: 'fraction' },
  });
  const table = store.createTable(schema, { capacity: n });
  for (let i = 0; i < n; i++) {
    const u = rng.rngUniform(1, rng.Streams.bench, 0, i, 1, 0);
    table.add({
      province: 1 + (i % 1500),
      culture: i % 40,
      size: 1000 * u,
      wealth: 50 * u,
      literacy: u,
    });
  }
  return table;
}

export function coreScenario(): Metric[] {
  const n = 1_000_000;
  const rngMs = stats(
    time(() => {
      const d = rng.createRng(7).stream(rng.Streams.bench).at(1, 1);
      let s = 0;
      for (let i = 0; i < n; i++) s += d.uniform();
      consume(s);
    }, 10),
  );
  const expMs = stats(
    time(() => {
      let s = 0;
      for (let i = 0; i < n; i++) s += math.exp(i * 1e-6);
      consume(s);
    }, 10),
  );
  const sinMs = stats(
    time(() => {
      let s = 0;
      for (let i = 0; i < n; i++) s += math.sin(i * 1e-3);
      consume(s);
    }, 10),
  );

  const table = popTable(15_000);
  const serializeMs = stats(time(() => serialize.serializeState([table], ENGINE_VERSION), 50));
  const hashMs = stats(time(() => serialize.hashState([table]), 50));

  // Overhead del scheduler: 8 sistemas vacíos, 1.000 ticks.
  const noop: scheduler.SystemDef<null>[] = scheduler.PHASES.slice(0, 8).map((phase) => ({
    contract: { name: phase, phase, cadence: { kind: 'annual' }, reads: [], writes: [], emits: [] },
    run: () => undefined,
  }));
  const pipeline = scheduler.createPipeline(noop);
  const ids = new store.IdAllocator<'event'>();
  const tickMs = stats(
    time(() => {
      for (let year = 1; year <= 1000; year++) {
        pipeline.runTick(null, { year, events: new events.EventBus({ year, ids, checks: false }) });
      }
    }, 10),
  );

  const ns = (ms: number) => (ms * 1e6) / n;
  return [
    { key: 'core.rng.uniform', value: ns(rngMs.p50), unit: 'ns/llamada' },
    { key: 'core.math.exp', value: ns(expMs.p50), unit: 'ns/llamada' },
    { key: 'core.math.sin', value: ns(sinMs.p50), unit: 'ns/llamada' },
    { key: 'core.serialize.15kPops', value: serializeMs.p50, unit: 'ms' },
    { key: 'core.hashState.15kPops', value: hashMs.p50, unit: 'ms' },
    { key: 'core.scheduler.tick8Systems', value: (tickMs.p50 * 1000) / 1000, unit: 'µs/tick' },
  ];
}
