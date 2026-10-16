// Medición headless del spike B en Node: `pnpm --filter @ws/spike-worker measure:node [años]`.
// Imprime JSON con tiempos por año, tamaños de historia y el hash final.
import { performance } from 'node:perf_hooks';
import { deflateSync } from 'fflate';
import { createSim, DEFAULT_CONFIG, encodeDelta, yearHash } from './sim';

const years = Number(process.argv[2] ?? DEFAULT_CONFIG.years);
const hashEveryYear = process.argv.includes('--hash');
const sim = createSim(DEFAULT_CONFIG);

const stepMs: number[] = [];
let prevView = sim.view();
let deltaBytes = 0;
let keyframeRaw = 0;
let keyframeCompressed = 0;
let keyframes = 0;
let keyframeMs = 0;
let hashMs = 0;
let events = 0;
let territory = 0;
let lastHash = '';
const t0 = performance.now();

for (let i = 0; i < years; i++) {
  const s = performance.now();
  const r = sim.step();
  stepMs.push(performance.now() - s);
  events += r.events.length;
  territory += r.events.filter((e) => e.type === 'territory.changed').length;
  const view = sim.view();
  deltaBytes += encodeDelta(r.year, prevView, view).byteLength;
  prevView = view;
  if (hashEveryYear) {
    const h = performance.now();
    lastHash = yearHash(sim, r);
    hashMs += performance.now() - h;
  }
  if ((i + 1) % DEFAULT_CONFIG.keyframeEvery === 0) {
    const k = performance.now();
    const raw = sim.snapshot();
    const packed = deflateSync(raw, { level: 6 });
    keyframeMs += performance.now() - k;
    keyframeRaw += raw.byteLength;
    keyframeCompressed += packed.byteLength;
    keyframes++;
  }
}
const totalMs = performance.now() - t0;
const sorted = [...stepMs].sort((a, b) => a - b);
const pct = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0;
const mb = (b: number) => Math.round((b / 1048576) * 100) / 100;

console.log(
  JSON.stringify(
    {
      years,
      totalSeconds: Math.round(totalMs / 10) / 100,
      msPerYear: {
        avg: Math.round((stepMs.reduce((a, b) => a + b, 0) / years) * 1000) / 1000,
        p50: Math.round(pct(0.5) * 1000) / 1000,
        p95: Math.round(pct(0.95) * 1000) / 1000,
        max: Math.round(pct(1) * 1000) / 1000,
      },
      hashMsPerYear: hashEveryYear ? Math.round((hashMs / years) * 1000) / 1000 : null,
      keyframes: {
        count: keyframes,
        rawMB: mb(keyframeRaw),
        compressedMB: mb(keyframeCompressed),
        msEach: Math.round((keyframeMs / Math.max(1, keyframes)) * 100) / 100,
      },
      visualDeltasMB: mb(deltaBytes),
      events,
      territoryChanges: territory,
      polities: sim.world.state.polity.size,
      finalYear: sim.year,
      finalHash: hashEveryYear ? lastHash : sim.stateHash(),
      heapMB: mb(process.memoryUsage().heapUsed),
    },
    null,
    2,
  ),
);
