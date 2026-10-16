// Hilo principal del spike B: pinta el mapa en cada cuadro desde los deltas del Worker, mide
// fps sin bloquear y rebobina pidiendo vistas del pasado. `?auto=1&years=N` corre solo y deja
// los resultados en `window.__spikeB` (lo usa la medición con Playwright).
import { time } from '@ws/core';
import type { FromWorker, ToWorker } from './protocol';
import { applyDelta, type MapView } from './sim';

const params = new URLSearchParams(location.search);
const auto = params.get('auto') === '1';
const totalYears = Number(params.get('years') ?? 14000);
const sliceMs = Number(params.get('slice') ?? 12);

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`falta #${id}`);
  return el;
}
const canvas = $('map') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('sin canvas 2D');
const hud = $('hud') as HTMLPreElement;
const timeline = $('timeline') as HTMLInputElement;
const cursorLabel = $('cursor') as HTMLDivElement;
const runButton = $('run') as HTMLButtonElement;
const pauseButton = $('pause') as HTMLButtonElement;
const fullButton = $('full') as HTMLButtonElement;
const hashBox = $('hash') as HTMLInputElement;
const modeSelect = $('mode') as HTMLSelectElement;

const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
const send = (m: ToWorker) => {
  worker.postMessage(m);
};

let startYear = -12000;
let head: MapView | null = null; // vista de la cabeza de la simulación
let shown: MapView | null = null; // vista que se pinta (cabeza o pasado)
let headK = 0;
let viewingPast = false;
let image: ImageData | null = null;

// Métricas
const stepMs: number[] = [];
let batches = 0;
let bytes = 0;
let runStart = 0;
let runEnd = 0;
let lastHash: string | null = null;
let historyStats: unknown = null;
const frameIntervals: number[] = [];
let lastFrame = 0;
let running = false;
const viewLatency: number[] = [];
const fullLatency: number[] = [];
let request = 0;
const pending = new Map<number, (m: FromWorker) => void>();

const yearOf = (k: number) =>
  k === 0 ? `inicio de ${label(startYear)}` : `fin de ${label(time.addYears(startYear, k - 1))}`;
function label(year: number): string {
  return year < 0 ? `${-year} a.C.` : `${year} d.C.`;
}

function color(id: number): [number, number, number] {
  if (id === 0) return [40, 40, 40];
  let h = Math.imul(id ^ (id >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return [64 + (h & 0x7f) + 32, 64 + ((h >>> 8) & 0x7f) + 32, 64 + ((h >>> 16) & 0x7f) + 32];
}

function paint(): void {
  if (!shown || !image || !ctx) return;
  const source = modeSelect.value === 'culture' ? shown.cultures : shown.owners;
  const data = image.data;
  for (let i = 0; i < source.length; i++) {
    const [r, g, b] = color((source[i] ?? 0) * (modeSelect.value === 'culture' ? 7919 : 1));
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}

function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0;
}
const avg = (values: readonly number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
const round = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

function results() {
  const fps = frameIntervals.map((ms) => 1000 / ms);
  return {
    done: runEnd > 0,
    years: headK,
    totalSeconds: round(((runEnd || performance.now()) - runStart) / 1000),
    msPerYear: { avg: round(avg(stepMs), 3), p95: round(percentile(stepMs, 0.95), 3) },
    mainThread: {
      fpsAvg: round(avg(fps), 1),
      fpsP5: round(percentile(fps, 0.05), 1),
      framesOver25ms: frameIntervals.filter((ms) => ms > 25).length,
      maxFrameMs: round(Math.max(0, ...frameIntervals), 1),
    },
    messages: { batches, bytes, yearsPerBatch: round(headK / Math.max(1, batches), 1) },
    history: historyStats,
    rewind: {
      viewMsAvg: round(avg(viewLatency), 3),
      viewMsMax: round(Math.max(0, ...viewLatency), 3),
      fullStateMsAvg: round(avg(fullLatency), 1),
      fullStateMsMax: round(Math.max(0, ...fullLatency), 1),
    },
    hash: lastHash,
  };
}

function renderHud(): void {
  const r = results();
  hud.textContent = [
    `cabeza: ${yearOf(headK)} (${headK} años)`,
    `tiempo: ${r.totalSeconds} s · ${round(headK / Math.max(0.001, r.totalSeconds), 0)} años/s`,
    `ms/año: prom ${r.msPerYear.avg} · p95 ${r.msPerYear.p95}`,
    `hilo principal: ${r.mainThread.fpsAvg} fps prom · p5 ${r.mainThread.fpsP5} · cuadros > 25 ms: ${r.mainThread.framesOver25ms} · máx ${r.mainThread.maxFrameMs} ms`,
    `mensajes: ${r.messages.batches} lotes · ${round(bytes / 1024, 1)} KiB · ${r.messages.yearsPerBatch} años/lote`,
    `historia: ${JSON.stringify(r.history)}`,
    `rebobinado (vista): prom ${r.rewind.viewMsAvg} ms · máx ${r.rewind.viewMsMax} ms`,
    `estado completo a la fecha: prom ${r.rewind.fullStateMsAvg} ms · máx ${r.rewind.fullStateMsMax} ms`,
    `hash: ${r.hash ?? '—'}`,
  ].join('\n');
}

function frame(now: number): void {
  if (running && lastFrame > 0) frameIntervals.push(now - lastFrame);
  lastFrame = now;
  paint();
  renderHud();
  requestAnimationFrame(frame);
}

function ask<T extends FromWorker>(msg: ToWorker & { request: number }): Promise<T> {
  return new Promise((resolve) => {
    pending.set(msg.request, (m) => {
      resolve(m as T);
    });
    send(msg);
  });
}

worker.onmessage = (event: MessageEvent<FromWorker>) => {
  const m = event.data;
  switch (m.type) {
    case 'init':
      startYear = m.startYear;
      head = { owners: m.owners, cultures: m.cultures };
      shown = head;
      image = new ImageData(m.width, m.height);
      requestAnimationFrame(frame);
      if (auto) start();
      break;
    case 'batch': {
      batches++;
      bytes += m.deltas.byteLength + m.stepMs.byteLength;
      for (const ms of m.stepMs) stepMs.push(ms);
      if (head) {
        let at = 0;
        while (at < m.deltas.length) at += applyDelta(head, m.deltas, at);
      }
      headK = m.head;
      lastHash = m.hash ?? lastHash;
      historyStats = m.history;
      timeline.max = String(headK);
      if (!viewingPast) {
        timeline.value = String(headK);
        shown = head;
      }
      break;
    }
    case 'done':
      running = false;
      runEnd = performance.now();
      pauseButton.disabled = true;
      if (auto) void afterRun();
      break;
    case 'view':
    case 'fullState':
      pending.get(m.request)?.(m);
      pending.delete(m.request);
      break;
  }
};

function start(): void {
  runStart = performance.now();
  running = true;
  runButton.disabled = true;
  pauseButton.disabled = false;
  timeline.disabled = false;
  fullButton.disabled = false;
  send({
    type: 'start',
    years: totalYears,
    sliceMs,
    hash: auto ? params.get('hash') === '1' : hashBox.checked,
  });
}

async function viewPast(k: number): Promise<void> {
  const m = await ask<Extract<FromWorker, { type: 'view' }>>({
    type: 'view',
    k,
    request: ++request,
  });
  viewLatency.push(m.ms);
  viewingPast = m.k < headK;
  shown = viewingPast ? { owners: m.owners, cultures: m.cultures } : head;
  cursorLabel.textContent = viewingPast ? `viendo ${yearOf(m.k)} (rebobinado)` : '';
}

async function fullStateAt(k: number): Promise<string> {
  const m = await ask<Extract<FromWorker, { type: 'fullState' }>>({
    type: 'fullState',
    k,
    request: ++request,
  });
  fullLatency.push(m.ms);
  return m.hash;
}

/** En modo auto: rebobina a 20 años repartidos y reconstruye 5 estados completos. */
async function afterRun(): Promise<void> {
  for (let i = 0; i < 20; i++) await viewPast(Math.floor(((i + 0.5) / 20) * headK));
  for (let i = 0; i < 5; i++)
    await fullStateAt(Math.floor(((i + 0.5) / 5) * headK) + 99 - (i % 2) * 50);
  (window as unknown as { __spikeB: unknown }).__spikeB = results();
}

runButton.onclick = start;
pauseButton.onclick = () => {
  if (pauseButton.textContent === 'Pausa') {
    send({ type: 'pause' });
    running = false;
    pauseButton.textContent = 'Seguir';
  } else {
    send({ type: 'resume' });
    running = true;
    pauseButton.textContent = 'Pausa';
  }
};
timeline.oninput = () => {
  void viewPast(Number(timeline.value));
};
fullButton.onclick = () => {
  void fullStateAt(Number(timeline.value)).then((hash) => {
    cursorLabel.textContent = `estado completo de ${yearOf(Number(timeline.value))}: hash ${hash}`;
  });
};
