// Escenario world-medium (P1.9): la corrida completa del mundo mediano con la historia grabada,
// como la vive la web. Se mide ANTES de optimizar (BRIEF): ms/año (prom y p95), costo de grabar,
// tamaño del keyframe y del `.wsim`, consultas a la fecha (D45) y hash del estado final.
import { performance } from 'node:perf_hooks';
import { encodeWsim, History } from '@ws/history';
import { Sim } from '@ws/sim';
import type { WorldStatic } from '@ws/worldgen';
import type { Metric } from '../report';
import { latency, stats, worstCaseIndices } from '../measure';

/** Consultas de muestra: k repartidos por la corrida, en el peor caso de keyframes. */
const MAP_SAMPLES = 40;
const FULL_STATE_SAMPLES = 6;

export function worldScenario(world: WorldStatic): Metric[] {
  const sim = Sim.create(world);
  const history = History.start(sim);
  const stepMs: number[] = [];
  let recordMs = 0;
  while (sim.year <= sim.endYear) {
    const t0 = performance.now();
    const result = sim.step();
    const t1 = performance.now();
    history.record(sim, result);
    stepMs.push(t1 - t0);
    recordMs += performance.now() - t1;
  }
  const s = stats(stepMs);
  const years = history.years;
  const keyframes = [...history.data.keyframes.entries()];
  const lastKeyframe = keyframes.reduce((a, b) => (b[0] > a[0] ? b : a), [0, new Uint8Array()]);
  const wsim = encodeWsim(world.params, world.hash, history.data, sim.snapshot());
  history.frameAtIndex(1); // calentar
  const every = history.data.keyframeEvery;
  const mapAt = latency(
    (k) => history.frameAtIndex(k),
    worstCaseIndices(years, every, MAP_SAMPLES),
  );
  const fullState = latency(
    (k) => history.fullStateAt(history.yearOf(k)),
    worstCaseIndices(years, every, FULL_STATE_SAMPLES),
  );
  const h0 = performance.now();
  sim.hash();
  const hashMs = performance.now() - h0;
  return [
    { key: 'world.medium.msPerYear', value: s.avg, unit: 'ms' },
    { key: 'world.medium.msPerYearP95', value: s.p95, unit: 'ms' },
    { key: 'world.medium.recordMsPerYear', value: recordMs / years, unit: 'ms' },
    { key: 'world.medium.keyframeKB', value: lastKeyframe[1].length / 1024, unit: 'KB' },
    { key: 'world.medium.wsimMB', value: wsim.length / 1e6, unit: 'MB' },
    { key: 'world.medium.mapAtMaxMs', value: mapAt.maxMs, unit: 'ms' },
    { key: 'world.medium.fullStateMaxMs', value: fullState.maxMs, unit: 'ms' },
    { key: 'world.medium.finalHashMs', value: hashMs, unit: 'ms' },
  ];
}
