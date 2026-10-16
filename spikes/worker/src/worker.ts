/// <reference lib="webworker" />
// Worker de simulación del spike B: corre por tandas de ~sliceMs, manda los deltas como
// ArrayBuffer transferibles y atiende pedidos de rebobinado entre tandas.
import { History } from './history';
import type { FromWorker, ToWorker } from './protocol';
import { createSim, DEFAULT_CONFIG, yearHash } from './sim';

declare const self: DedicatedWorkerGlobalScope;

const config = DEFAULT_CONFIG;
const sim = createSim(config);
const history = new History(config, sim);
let target = 0;
let sliceMs = 12;
let hashEveryYear = false;
let running = false;
let started = 0;

function send(message: FromWorker, transfer: Transferable[] = []): void {
  self.postMessage(message, transfer);
}

// Ceder el control sin el mínimo de 4 ms de setTimeout anidado: un MessageChannel propio.
const yieldChannel = new MessageChannel();
yieldChannel.port1.onmessage = () => {
  slice();
};
const scheduleSlice = () => {
  yieldChannel.port2.postMessage(null);
};

function slice(): void {
  if (!running) return;
  const t0 = performance.now();
  const deltas: Uint32Array[] = [];
  const stepMs: number[] = [];
  let hash: string | null = null;
  while (history.years < target && performance.now() - t0 < sliceMs) {
    const s = performance.now();
    const result = sim.step();
    stepMs.push(performance.now() - s);
    deltas.push(history.record(result.year, sim));
    if (hashEveryYear) hash = yearHash(sim, result);
  }
  const words = new Uint32Array(deltas.reduce((n, d) => n + d.length, 0));
  let at = 0;
  for (const d of deltas) {
    words.set(d, at);
    at += d.length;
  }
  const ms = Float32Array.from(stepMs);
  send(
    {
      type: 'batch',
      deltas: words,
      stepMs: ms,
      head: history.years,
      headYear: sim.year,
      hash,
      history: history.stats(),
    },
    [words.buffer, ms.buffer],
  );
  if (history.years >= target) {
    running = false;
    send({ type: 'done', totalMs: performance.now() - started });
    return;
  }
  scheduleSlice();
}

self.onmessage = (event: MessageEvent<ToWorker>) => {
  const msg = event.data;
  switch (msg.type) {
    case 'start':
      target = msg.years;
      sliceMs = msg.sliceMs;
      hashEveryYear = msg.hash;
      running = true;
      started = performance.now();
      scheduleSlice();
      break;
    case 'pause':
      running = false;
      break;
    case 'resume':
      if (!running && history.years < target) {
        running = true;
        scheduleSlice();
      }
      break;
    case 'view': {
      const t0 = performance.now();
      const view = history.viewAt(msg.k);
      send(
        {
          type: 'view',
          request: msg.request,
          k: msg.k,
          owners: view.owners,
          cultures: view.cultures,
          ms: performance.now() - t0,
        },
        [view.owners.buffer, view.cultures.buffer],
      );
      break;
    }
    case 'fullState': {
      const t0 = performance.now();
      const past = history.simAt(msg.k);
      send({
        type: 'fullState',
        request: msg.request,
        k: msg.k,
        hash: past.stateHash(),
        ms: performance.now() - t0,
      });
      break;
    }
  }
};

const initial = sim.view();
send(
  {
    type: 'init',
    width: config.width,
    height: config.height,
    owners: initial.owners,
    cultures: initial.cultures,
    startYear: config.startYear,
  },
  [initial.owners.buffer, initial.cultures.buffer],
);
