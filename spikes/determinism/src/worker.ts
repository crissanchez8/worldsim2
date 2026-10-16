/// <reference lib="webworker" />
// Corre la batería en un Worker para no bloquear la página (y porque así corre el motor real).
import { mathBattery, rngBattery, runYears } from './battery';

declare const self: DedicatedWorkerGlobalScope;

export type WorkerMessage =
  | { readonly type: 'battery'; readonly math: Record<string, string>; readonly rng: string }
  | { readonly type: 'progress'; readonly done: number; readonly hashes: readonly string[] }
  | { readonly type: 'done'; readonly seconds: number };

self.onmessage = (event: MessageEvent<{ years: number }>) => {
  const t0 = performance.now();
  self.postMessage({
    type: 'battery',
    math: mathBattery(),
    rng: rngBattery(),
  } satisfies WorkerMessage);
  let chunk: string[] = [];
  runYears(event.data.years, (i, hash) => {
    chunk.push(hash);
    if (chunk.length === 250 || i === event.data.years - 1) {
      self.postMessage({ type: 'progress', done: i + 1, hashes: chunk } satisfies WorkerMessage);
      chunk = [];
    }
  });
  self.postMessage({
    type: 'done',
    seconds: (performance.now() - t0) / 1000,
  } satisfies WorkerMessage);
};
